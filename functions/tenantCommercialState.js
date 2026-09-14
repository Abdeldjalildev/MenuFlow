const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { buildEntitlementSnapshot, getPlan } = require('./commercialEntitlements');

const requireAdmin = request => {
  const role = request.auth?.token?.role;
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  if (!['Admin', 'SuperAdmin'].includes(role)) throw new HttpsError('permission-denied', 'Admin access is required.');
};

const assertTenantAccess = async (db, restaurantId, request) => {
  if (request.auth.token.role === 'SuperAdmin') return;
  const membership = await db.doc(`restaurants/${restaurantId}/admins/${request.auth.uid}`).get();
  if (!membership.exists || membership.data()?.adminUid !== request.auth.uid) throw new HttpsError('permission-denied', 'Restaurant access is required.');
};

const assertRestaurantExists = async (db, restaurantId) => {
  const restaurant = await db.doc(`restaurants/${restaurantId}`).get();
  if (!restaurant.exists) throw new HttpsError('not-found', 'Restaurant does not exist.');
  return restaurant.data() || {};
};

const assertRestaurantActive = async (db, restaurantId) => {
  const restaurant = await assertRestaurantExists(db, restaurantId);
  if (restaurant.lifecycleState !== 'active') throw new HttpsError('failed-precondition', 'Restaurant is not active.');
  return restaurant;
};

const getCommercialState = onCall(async request => {
  requireAdmin(request);
  const restaurantId = request.data?.restaurantId;
  if (typeof restaurantId !== 'string' || !restaurantId.trim()) throw new HttpsError('invalid-argument', 'restaurantId is required.');
  const db = getFirestore();
  await assertTenantAccess(db, restaurantId, request);
  await assertRestaurantActive(db, restaurantId);
  const snapshot = await db.doc(`restaurants/${restaurantId}/commercial/subscription`).get();
  if (!snapshot.exists) return { ok: true, planId: 'starter', subscriptionState: 'active', entitlements: buildEntitlementSnapshot({ planId: 'starter', state: 'active' }).entitlements };
  return { ok: true, ...buildEntitlementSnapshot(snapshot.data()) };
});

const setCommercialState = onCall(async request => {
  if (request.auth?.token?.role !== 'SuperAdmin') throw new HttpsError('permission-denied', 'Only SuperAdmin can change commercial state.');
  const { restaurantId, planId, state } = request.data || {};
  if (typeof restaurantId !== 'string' || !restaurantId.trim() || !getPlan(planId)) throw new HttpsError('invalid-argument', 'Valid restaurantId and planId are required.');
  const db = getFirestore();
  await assertRestaurantExists(db, restaurantId);
  const snapshot = buildEntitlementSnapshot({ planId, state });
  await db.doc(`restaurants/${restaurantId}/commercial/subscription`).set({ planId, state, updatedAt: FieldValue.serverTimestamp(), entitlements: snapshot.entitlements }, { merge: true });
  return { ok: true, ...snapshot };
});

const requestCommercialChange = onCall(async request => {
  requireAdmin(request);
  const { restaurantId, requestedPlanId } = request.data || {};
  if (typeof restaurantId !== 'string' || !restaurantId.trim() || !getPlan(requestedPlanId)) throw new HttpsError('invalid-argument', 'Valid restaurantId and requestedPlanId are required.');
  const db = getFirestore();
  await assertTenantAccess(db, restaurantId, request);
  await assertRestaurantActive(db, restaurantId);
  const requestRef = db.collection(`restaurants/${restaurantId}/commercial/changeRequests`).doc();
  await requestRef.create({ requestedPlanId, requestedBy: request.auth.uid, status: 'pending', createdAt: FieldValue.serverTimestamp() });
  return { ok: true, requestId: requestRef.id, status: 'pending' };
});

module.exports = { getCommercialState, setCommercialState, requestCommercialChange };
