const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { aggregateAnalytics, toQueryBounds } = require('./analyticsAggregation');
const { assertDateRange, normalizeAnalyticsContract } = require('./analyticsContract');

async function assertAnalyticsActor(request, restaurantId) {
  const token = request.auth?.token;
  if (!token) throw new HttpsError('unauthenticated', 'Authentication is required.');
  if (token.role === 'SuperAdmin') return;
  if (token.role !== 'Admin') throw new HttpsError('permission-denied', 'Only Admin or SuperAdmin actors can access analytics.');
  const membership = await getFirestore().doc(`restaurants/${restaurantId}/admins/${request.auth.uid}`).get();
  if (!membership.exists || membership.data()?.adminUid !== request.auth.uid) throw new HttpsError('permission-denied', 'Admin has no membership in this restaurant.');
}

exports.getAnalyticsSummary = onCall(async request => {
  const restaurantId = request.data?.restaurantId;
  const startDate = request.data?.startDate;
  const endDate = request.data?.endDate;
  if (typeof restaurantId !== 'string' || !restaurantId.trim()) throw new HttpsError('invalid-argument', 'restaurantId is required.');
  assertDateRange(startDate, endDate);
  await assertAnalyticsActor(request, restaurantId);
  const db = getFirestore();
  const restaurantSnap = await db.doc(`restaurants/${restaurantId}`).get();
  if (!restaurantSnap.exists) throw new HttpsError('not-found', 'Restaurant does not exist.');
  const restaurant = restaurantSnap.data() || {};
  const analyticsConfig = restaurant.analytics || {};
  const contract = normalizeAnalyticsContract({ timezone: analyticsConfig.timezone, currency: analyticsConfig.currency || restaurant.currency });
  const bounds = toQueryBounds(startDate, endDate, contract.timezone);
  const ordersSnap = await db.collection(`restaurants/${restaurantId}/orders`)
    .where('createdAt', '>=', bounds.startUtc)
    .where('createdAt', '<=', bounds.endUtc)
    .limit(5000)
    .get();
  if (ordersSnap.size >= 5000) throw new HttpsError('resource-exhausted', 'Analytics range contains too many order records for query-time aggregation. Narrow the range or use a materialized summary.');
  const expensesSnap = await db.collection(`restaurants/${restaurantId}/expenses`)
    .where('expenseDate', '>=', bounds.startUtc)
    .where('expenseDate', '<=', bounds.endUtc)
    .limit(5000)
    .get();
  if (expensesSnap.size >= 5000) throw new HttpsError('resource-exhausted', 'Analytics range contains too many expense records for query-time aggregation.');
  const result = aggregateAnalytics({
    orders: ordersSnap.docs.map(doc => doc.data()),
    expenses: expensesSnap.docs.map(doc => doc.data()),
    contract,
    startDate,
    endDate,
  });
  return { ok: true, ...result, source: 'server-query-time' };
});

module.exports = { getAnalyticsSummary: exports.getAnalyticsSummary };
