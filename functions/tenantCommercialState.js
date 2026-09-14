const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { buildEntitlementSnapshot } = require('./commercialEntitlements');

const requireAdmin = request => {
  const role = request.auth?.token?.role;
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  if (!['Admin', 'SuperAdmin'].includes(role)) throw new HttpsError('permission-denied', 'Admin access is required.');
};

const assertTenantAccess = async (db, restaurantId, request) => {
  if (request.auth.token.role === 'SuperAdmin') return;
  const membership = await db.doc(`restaurants/${restaurantId}/admins/${request.auth.uid}`).get();
  if (!membership.exists || membership.data()?.adminUid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Restaurant access is required.');
  }
};

const getCommercialState = onCall(async request => {
  requireAdmin(request);
  const restaurantId = request.data?.restaurantId;
  if (typeof restaurantId !== 'string' || !restaurantId.trim()) throw new HttpsError('invalid-argument', 'restaurantId is required.');
  const db = getFirestore();
  await assertTenantAccess(db, restaurantId, request);
  const ref = db.doc(`restaurants/${restaurantId}/commercial/subscription`);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return { ok: true, planId: 'starter', subscriptionState: 'active', entitlements: buildEntitlementSnapshot({ planId: 'starter', state: 'active' }).entitlements };
  }
  return { ok: true, ...buildEntitlementSnapshot(snapshot.data()) };
});

const setCommercialState = onCall(async request => {
  if (request.auth?.token?.role !== 'SuperAdmin') throw new HttpsError('permission-denied', 'Only SuperAdmin can change commercial state.');
  const { restaurantId, planId, state } = request.data || {};
  if (typeof restaurantId !== 'string' || !restaurantId.trim()) throw new HttpsError('invalid-argument', 'restaurantId is required.');
  const snapshot = buildEntitlementSnapshot({ planId, state });
  const db = getFirestore();
  await db.doc(`restaurants/${restaurantId}/commercial/subscription`).set({ planId, state, updatedAt: FieldValue.serverTimestamp(), entitlements: snapshot.entitlements }, { merge: true });
  return { ok: true, ...snapshot };
});

module.exports = { getCommercialState, setCommercialState };
