const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;
const MAX_NAME_LENGTH = 160;

function normalizeRestaurantName(value) {
  if (!isNonEmptyString(value)) throw new HttpsError('invalid-argument', 'restaurantName is required.');
  const name = value.trim();
  if (name.length > MAX_NAME_LENGTH) throw new HttpsError('invalid-argument', 'restaurantName is too long.');
  return name;
}

function normalizeAdminUid(value) {
  if (!isNonEmptyString(value) || value.trim().length > 128) throw new HttpsError('invalid-argument', 'adminUid is required.');
  return value.trim();
}

/**
 * Canonical tenant onboarding authority.
 *
 * The callable is intentionally SuperAdmin-only until a separate, audited
 * self-service onboarding policy exists. Restaurant creation, initial Admin
 * membership and the active lifecycle state are server-authoritative.
 * Firebase Auth claims cannot participate in a Firestore transaction, so the
 * flow uses a recoverable `provisioning` state and only marks the tenant
 * `active` after the Admin claim succeeds.
 */
const createRestaurant = onCall(async request => {
  const caller = request.auth;
  if (!caller) throw new HttpsError('unauthenticated', 'Authentication is required.');
  if (caller.token?.role !== 'SuperAdmin') throw new HttpsError('permission-denied', 'Only SuperAdmin can create restaurants.');

  const restaurantName = normalizeRestaurantName(request.data?.restaurantName);
  const adminUid = normalizeAdminUid(request.data?.adminUid);
  if (adminUid === caller.uid) throw new HttpsError('invalid-argument', 'The initial Admin must be a separate Firebase user.');

  const auth = getAuth();
  try {
    const target = await auth.getUser(adminUid);
    if (target.customClaims?.role === 'SuperAdmin') throw new HttpsError('failed-precondition', 'The initial Admin cannot already be a SuperAdmin.');
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error?.code === 'auth/user-not-found') throw new HttpsError('not-found', 'The initial Admin Firebase user does not exist.');
    throw new HttpsError('internal', 'Unable to verify the initial Admin Firebase user.');
  }

  const db = getFirestore();
  const restaurantRef = db.collection('restaurants').doc();
  const membershipRef = restaurantRef.collection('admins').doc(adminUid);
  const createdAt = new Date();

  // Phase 14 deliberately does not invent billing/plan semantics. The tenant
  // gets only safe operational defaults required by the existing application.
  const restaurant = {
    name: restaurantName,
    lifecycleState: 'provisioning',
    currency: 'DZD',
    analytics: { currency: 'DZD' },
    createdAt,
    createdBy: caller.uid,
  };

  await db.runTransaction(async tx => {
    tx.create(restaurantRef, restaurant);
    tx.create(membershipRef, {
      adminUid,
      createdAt,
      createdBy: caller.uid,
    });
  });

  try {
    await auth.setCustomUserClaims(adminUid, { role: 'Admin', restaurantId: restaurantRef.id });
  } catch (error) {
    // Claims are external to the Firestore transaction. Remove the tenant and
    // membership when possible; if cleanup itself fails, the provisioning state
    // remains non-active and therefore is not presented as a successful tenant.
    try {
      await db.runTransaction(async tx => {
        tx.delete(membershipRef);
        tx.delete(restaurantRef);
      });
    } catch (cleanupError) {
      console.error('Tenant onboarding cleanup failed after Admin claim failure:', cleanupError);
    }
    throw new HttpsError('internal', 'Unable to provision the initial Admin authorization.');
  }

  try {
    await restaurantRef.update({ lifecycleState: 'active', updatedAt: new Date() });
  } catch (error) {
    throw new HttpsError('internal', 'Tenant was provisioned but could not be activated.');
  }

  await db.collection('restaurant_onboarding_audit').add({
    action: 'create',
    restaurantId: restaurantRef.id,
    adminUid,
    actorUid: caller.uid,
    createdAt: new Date(),
  });

  return { ok: true, restaurantId: restaurantRef.id, adminUid, lifecycleState: 'active' };
});

module.exports = { createRestaurant };
