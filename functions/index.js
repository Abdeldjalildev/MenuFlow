const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp } = require('firebase-admin/app');

initializeApp();

const ALLOWED_ROLES = new Set(['SuperAdmin', 'Admin', 'Cashier', 'Kitchen', 'Delivery']);
const TENANT_ROLES = new Set(['Admin', 'Cashier', 'Kitchen', 'Delivery']);
const ROLE_RANK = {
  Delivery: 10,
  Kitchen: 10,
  Cashier: 10,
  Admin: 20,
  SuperAdmin: 30,
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * Provision Firebase custom claims from a trusted server boundary.
 *
 * The function intentionally does not accept role/tenant authority from an
 * anonymous or unauthenticated caller. Tenant administrators may only manage
 * users inside their own tenant and may not assign privileged roles.
 * SuperAdmin bootstrap remains an explicit deployment/operations step.
 */
exports.provisionAuthzClaims = onCall(async (request) => {
  const caller = request.auth?.token;
  if (!caller) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const targetUid = request.data?.uid;
  const role = request.data?.role;
  const restaurantId = request.data?.restaurantId;

  if (!isNonEmptyString(targetUid) || !ALLOWED_ROLES.has(role)) {
    throw new HttpsError('invalid-argument', 'A valid uid and role are required.');
  }

  if (role !== 'SuperAdmin' && !isNonEmptyString(restaurantId)) {
    throw new HttpsError('invalid-argument', 'Tenant roles require restaurantId.');
  }

  const callerRole = caller.role;
  const callerRestaurantId = caller.restaurantId;
  if (!ALLOWED_ROLES.has(callerRole)) {
    throw new HttpsError('permission-denied', 'Caller has no valid authorization role.');
  }

  // Only an existing SuperAdmin can provision another SuperAdmin.
  if (role === 'SuperAdmin' && callerRole !== 'SuperAdmin') {
    throw new HttpsError('permission-denied', 'Only SuperAdmin may provision SuperAdmin claims.');
  }

  // Tenant administrators can only provision non-privileged tenant roles
  // inside their own tenant. They cannot promote users to Admin.
  if (callerRole !== 'SuperAdmin') {
    if (callerRole !== 'Admin' || !TENANT_ROLES.has(role)) {
      throw new HttpsError('permission-denied', 'Caller cannot provision this role.');
    }
    if (callerRestaurantId !== restaurantId) {
      throw new HttpsError('permission-denied', 'Cross-tenant claim provisioning is forbidden.');
    }
  }

  // Confirm the target account exists before changing its authorization state.
  try {
    await getAuth().getUser(targetUid);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'Target Firebase user does not exist.');
    }
    throw new HttpsError('internal', 'Unable to verify the target Firebase user.');
  }

  const claims = role === 'SuperAdmin'
    ? { role }
    : { role, restaurantId };

  await getAuth().setCustomUserClaims(targetUid, claims);

  // Keep an auditable server-side record of the claim decision. This record is
  // informational; Firestore Security Rules continue to authorize from the
  // signed Firebase token claims rather than this document.
  await getFirestore().collection('authz_claim_audit').add({
    targetUid,
    role,
    restaurantId: role === 'SuperAdmin' ? null : restaurantId,
    actorUid: request.auth.uid,
    actorRole: callerRole,
    createdAt: new Date(),
  });

  return { ok: true };
});
