const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { logDiagnostic } = require('./operationalDiagnostics');

const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;
const MAX_NAME_LENGTH = 160;
const AUTH_ROLES = new Set(['SuperAdmin', 'Admin', 'Cashier', 'Kitchen', 'Delivery', 'Waiter']);

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

const createRestaurant = onCall(async request => {
  const caller = request.auth;
  if (!caller) throw new HttpsError('unauthenticated', 'Authentication is required.');
  if (caller.token?.role !== 'SuperAdmin') throw new HttpsError('permission-denied', 'Only SuperAdmin can create restaurants.');

  const restaurantName = normalizeRestaurantName(request.data?.restaurantName);
  const adminUid = normalizeAdminUid(request.data?.adminUid);
  if (adminUid === caller.uid) throw new HttpsError('invalid-argument', 'The initial Admin must be a separate Firebase user.');

  const auth = getAuth();
  let target;
  try {
    target = await auth.getUser(adminUid);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') throw new HttpsError('not-found', 'The initial Admin Firebase user does not exist.');
    throw new HttpsError('internal', 'Unable to verify the initial Admin Firebase user.');
  }

  const originalClaims = { ...(target.customClaims || {}) };
  if (AUTH_ROLES.has(originalClaims.role)) throw new HttpsError('failed-precondition', 'The initial Admin Firebase user already has an authorization role.');

  const db = getFirestore();
  const existingMemberships = await db.collectionGroup('admins').where('adminUid', '==', adminUid).limit(1).get();
  if (!existingMemberships.empty) throw new HttpsError('failed-precondition', 'The initial Admin Firebase user already has a restaurant membership.');

  const restaurantRef = db.collection('restaurants').doc();
  const membershipRef = restaurantRef.collection('admins').doc(adminUid);
  const createdAt = new Date();
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
    tx.create(membershipRef, { adminUid, createdAt, createdBy: caller.uid });
  });

  try {
    await auth.setCustomUserClaims(adminUid, { ...originalClaims, role: 'Admin', restaurantId: restaurantRef.id });
  } catch (error) {
    try {
      await db.runTransaction(async tx => {
        tx.delete(membershipRef);
        tx.delete(restaurantRef);
      });
    } catch (cleanupError) {
      logDiagnostic('error', 'tenant_onboarding', cleanupError, { restaurantId: restaurantRef.id, adminUid });
    }
    throw new HttpsError('internal', 'Unable to provision the initial Admin authorization.');
  }

  try {
    await restaurantRef.update({ lifecycleState: 'active', updatedAt: new Date() });
  } catch (error) {
    try {
      await auth.setCustomUserClaims(adminUid, originalClaims);
    } catch (restoreError) {
      logDiagnostic('error', 'tenant_onboarding', restoreError, { restaurantId: restaurantRef.id, adminUid });
    }
    logDiagnostic('error', 'tenant_onboarding', error, { restaurantId: restaurantRef.id, adminUid });
    throw new HttpsError('internal', 'Tenant was provisioned but could not be activated.');
  }

  await db.collection('restaurant_onboarding_audit').add({ action: 'create', restaurantId: restaurantRef.id, adminUid, actorUid: caller.uid, createdAt: new Date() });
  return { ok: true, restaurantId: restaurantRef.id, adminUid, lifecycleState: 'active' };
});

module.exports = { createRestaurant };
