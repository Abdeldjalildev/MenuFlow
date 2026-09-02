const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp } = require('firebase-admin/app');

initializeApp();

const ALLOWED_ROLES = new Set(['SuperAdmin', 'Admin', 'Cashier', 'Kitchen', 'Delivery']);
const TENANT_STAFF_ROLES = new Set(['Cashier', 'Kitchen', 'Delivery']);
const TRANSITIONS = {
  pending: new Set(['preparing']),
  preparing: new Set(['driver_claimed', 'ready_for_payment', 'ready']),
  driver_claimed: new Set(['ready_for_delivery']),
  ready: new Set(['ready_for_payment']),
  ready_for_payment: new Set(['ready_for_delivery', 'paid']),
  ready_for_delivery: new Set(['on_the_way']),
  on_the_way: new Set(['delivered_unpaid']),
  delivered_unpaid: new Set(['paid']),
  paid: new Set(['completed']),
  completed: new Set(),
};
const ROLE_TRANSITIONS = {
  Admin: null,
  SuperAdmin: null,
  Kitchen: new Set(['pending:preparing', 'preparing:ready', 'preparing:ready_for_payment']),
  Cashier: new Set(['ready_for_payment:paid', 'delivered_unpaid:paid', 'ready_for_payment:completed', 'paid:completed']),
  Delivery: new Set(['preparing:driver_claimed', 'driver_claimed:ready_for_delivery', 'ready_for_delivery:on_the_way', 'on_the_way:delivered_unpaid']),
};
const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;

exports.provisionAuthzClaims = onCall(async (request) => {
  const caller = request.auth?.token;
  if (!caller) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const targetUid = request.data?.uid;
  const role = request.data?.role;
  const restaurantId = request.data?.restaurantId;
  if (!isNonEmptyString(targetUid) || !ALLOWED_ROLES.has(role)) throw new HttpsError('invalid-argument', 'A valid uid and role are required.');
  if (role !== 'SuperAdmin' && !isNonEmptyString(restaurantId)) throw new HttpsError('invalid-argument', 'Tenant roles require restaurantId.');
  const callerRole = caller.role;
  const callerRestaurantId = caller.restaurantId;
  if (!ALLOWED_ROLES.has(callerRole)) throw new HttpsError('permission-denied', 'Caller has no valid authorization role.');
  if (role === 'SuperAdmin' && callerRole !== 'SuperAdmin') throw new HttpsError('permission-denied', 'Only SuperAdmin may provision SuperAdmin claims.');
  if (callerRole !== 'SuperAdmin') {
    if (callerRole !== 'Admin' || !TENANT_STAFF_ROLES.has(role)) throw new HttpsError('permission-denied', 'Caller cannot provision this role.');
    if (callerRestaurantId !== restaurantId) throw new HttpsError('permission-denied', 'Cross-tenant claim provisioning is forbidden.');
  }
  let targetUser;
  try { targetUser = await getAuth().getUser(targetUid); } catch (error) { if (error?.code === 'auth/user-not-found') throw new HttpsError('not-found', 'Target Firebase user does not exist.'); throw new HttpsError('internal', 'Unable to verify the target Firebase user.'); }
  if (targetUser.customClaims?.role === 'SuperAdmin' && callerRole !== 'SuperAdmin') throw new HttpsError('permission-denied', 'Tenant administrators cannot modify SuperAdmin claims.');
  await getAuth().setCustomUserClaims(targetUid, role === 'SuperAdmin' ? { role } : { role, restaurantId });
  await getFirestore().collection('authz_claim_audit').add({ targetUid, role, restaurantId: role === 'SuperAdmin' ? null : restaurantId, actorUid: request.auth.uid, actorRole: callerRole, createdAt: new Date() });
  return { ok: true };
});

function assertTransition(role, from, to) {
  if (!TRANSITIONS[from]?.has(to)) throw new HttpsError('failed-precondition', `Illegal order transition: ${from} -> ${to}.`);
  if (role === 'Admin' || role === 'SuperAdmin') return;
  if (!ROLE_TRANSITIONS[role]?.has(`${from}:${to}`)) throw new HttpsError('permission-denied', `Role ${role} cannot perform ${from} -> ${to}.`);
}

function normalizeIngredient(recipeIngredient) {
  const inventoryItemId = recipeIngredient?.inventoryItemId;
  const quantity = Number(recipeIngredient?.quantity);
  if (!isNonEmptyString(inventoryItemId) || !Number.isFinite(quantity) || quantity <= 0) return null;
  return { inventoryItemId, quantity };
}

exports.transitionOrder = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const role = auth.token?.role;
  const restaurantId = auth.token?.restaurantId;
  if (!ALLOWED_ROLES.has(role)) throw new HttpsError('permission-denied', 'A staff authorization role is required.');
  if (!isNonEmptyString(restaurantId) && role !== 'SuperAdmin') throw new HttpsError('permission-denied', 'Tenant authorization is required.');
  const orderId = request.data?.orderId;
  const newStatus = request.data?.newStatus;
  if (!isNonEmptyString(orderId) || !isNonEmptyString(newStatus)) throw new HttpsError('invalid-argument', 'orderId and newStatus are required.');

  const db = getFirestore();
  const effectiveRestaurant = role === 'SuperAdmin' ? request.data?.restaurantId : restaurantId;
  if (!isNonEmptyString(effectiveRestaurant)) throw new HttpsError('invalid-argument', 'restaurantId is required for SuperAdmin operations.');
  const orderRef = db.doc(`restaurants/${effectiveRestaurant}/orders/${orderId}`);

  await db.runTransaction(async tx => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found.');
    const order = orderSnap.data();
    if (order.restaurantId !== effectiveRestaurant) throw new HttpsError('permission-denied', 'Tenant mismatch.');
    const from = order.status;
    assertTransition(role, from, newStatus);

    const updates = { status: newStatus, updatedAt: new Date() };
    if (newStatus === 'completed') updates.isPaid = true;

    // Deduct inventory exactly once when the order first enters preparation.
    // The idempotency marker lives on the order and is checked inside the same transaction.
    if (newStatus === 'preparing' && !order.inventoryDeducted) {
      const deductions = new Map();
      for (const item of Array.isArray(order.items) ? order.items : []) {
        const recipeId = item?.recipeId;
        const qty = Number(item?.quantity ?? item?.qty ?? 1);
        if (!isNonEmptyString(recipeId) || !Number.isFinite(qty) || qty <= 0) continue;
        const recipeRef = db.doc(`restaurants/${effectiveRestaurant}/recipes/${recipeId}`);
        const recipeSnap = await tx.get(recipeRef);
        if (!recipeSnap.exists) throw new HttpsError('failed-precondition', `Recipe ${recipeId} not found.`);
        const ingredients = Array.isArray(recipeSnap.data()?.recipeIngredients) ? recipeSnap.data().recipeIngredients : [];
        for (const rawIngredient of ingredients) {
          const ingredient = normalizeIngredient(rawIngredient);
          if (!ingredient) throw new HttpsError('failed-precondition', `Recipe ${recipeId} has an invalid ingredient.`);
          deductions.set(ingredient.inventoryItemId, (deductions.get(ingredient.inventoryItemId) || 0) + ingredient.quantity * qty);
        }
      }
      const inventoryRefs = [...deductions.keys()].map(id => db.doc(`restaurants/${effectiveRestaurant}/inventory/${id}`));
      const inventorySnaps = [];
      for (const ref of inventoryRefs) inventorySnaps.push(await tx.get(ref));
      inventorySnaps.forEach((snap, index) => {
        if (!snap.exists) throw new HttpsError('failed-precondition', `Inventory item ${inventoryRefs[index].id} not found.`);
        const data = snap.data();
        const current = Number(data.currentQuantity ?? data.quantity ?? 0);
        const required = deductions.get(inventoryRefs[index].id) || 0;
        if (!Number.isFinite(current) || current < required) throw new HttpsError('failed-precondition', `Insufficient stock for ${inventoryRefs[index].id}.`);
      });
      inventorySnaps.forEach((snap, index) => {
        const ref = inventoryRefs[index];
        const current = Number(snap.data().currentQuantity ?? snap.data().quantity ?? 0);
        const next = Number((current - (deductions.get(ref.id) || 0)).toFixed(4));
        tx.update(ref, { currentQuantity: next, quantity: next, updatedAt: new Date() });
      });
      updates.inventoryDeducted = true;
      updates.inventoryDeductedAt = new Date();
    }
    tx.update(orderRef, updates);
  });
  return { ok: true, orderId, status: newStatus };
});
