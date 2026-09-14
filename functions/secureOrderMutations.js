const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { buildAuthoritativeOrder, isNonEmptyString } = require('./orderPricing');

const STAFF_ROLES = new Set(['SuperAdmin', 'Admin', 'Cashier', 'Kitchen', 'Delivery']);

async function authorizeRestaurantActor(request, restaurantId, allowedRoles) {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const role = auth.token?.role;
  if (!STAFF_ROLES.has(role) || !allowedRoles.has(role)) throw new HttpsError('permission-denied', 'Actor is not authorized for this order mutation.');
  if (role === 'SuperAdmin') return;
  if (role === 'Admin') {
    const membership = await getFirestore().doc(`restaurants/${restaurantId}/admins/${auth.uid}`).get();
    if (!membership.exists || membership.data()?.adminUid !== auth.uid) throw new HttpsError('permission-denied', 'Admin has no membership in this restaurant.');
    return;
  }
  if (auth.token?.restaurantId !== restaurantId) throw new HttpsError('permission-denied', 'Cross-tenant order mutation is forbidden.');
}

async function loadOrder(request, allowedRoles) {
  const restaurantId = request.data?.restaurantId;
  const orderId = request.data?.orderId;
  if (!isNonEmptyString(restaurantId) || !isNonEmptyString(orderId)) throw new HttpsError('invalid-argument', 'restaurantId and orderId are required.');
  await authorizeRestaurantActor(request, restaurantId, allowedRoles);
  const db = getFirestore();
  const ref = db.doc(`restaurants/${restaurantId}/orders/${orderId}`);
  return { db, ref, restaurantId, orderId };
}

async function buildAuthoritativeAppend(db, restaurantId, currentItems, appendedItems) {
  if (!Array.isArray(appendedItems) || appendedItems.length === 0 || appendedItems.length > 50) throw new HttpsError('invalid-argument', 'Appended items must contain between 1 and 50 items.');
  const combined = [...(Array.isArray(currentItems) ? currentItems : []), ...appendedItems];
  if (combined.length > 50) throw new HttpsError('invalid-argument', 'An order cannot contain more than 50 items.');
  const menuIds = new Set(combined.map(item => item?.menuItemId).filter(isNonEmptyString));
  if (menuIds.size !== combined.length) throw new HttpsError('invalid-argument', 'Every order item requires menuItemId.');
  const menuDataById = new Map();
  for (const menuItemId of menuIds) {
    const snap = await db.doc(`restaurants/${restaurantId}/menuItems/${menuItemId}`).get();
    if (!snap.exists) throw new HttpsError('not-found', `Menu item ${menuItemId} does not exist in this restaurant.`);
    menuDataById.set(menuItemId, { ...(snap.data() || {}), __restaurantId: restaurantId });
  }
  return buildAuthoritativeOrder(combined, menuDataById);
}

const mutateOrder = onCall(async request => {
  const operation = request.data?.operation;
  if (!isNonEmptyString(operation)) throw new HttpsError('invalid-argument', 'operation is required.');

  if (operation === 'driver_claim') {
    const { db, ref, restaurantId } = await loadOrder(request, new Set(['Delivery', 'Admin', 'SuperAdmin']));
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError('not-found', 'Order not found.');
      const order = snap.data();
      if (order.restaurantId !== restaurantId) throw new HttpsError('permission-denied', 'Tenant mismatch.');
      if (order.status !== 'preparing' || order.isClaimed || order.driverId) throw new HttpsError('failed-precondition', 'Order is not available for driver claim.');
      const role = request.auth.token.role;
      if (role === 'Delivery') {
        tx.update(ref, { status: 'driver_claimed', driverId: request.auth.uid, isClaimed: true, driverName: request.auth.token.name || request.auth.token.email || null, updatedAt: new Date() });
      } else {
        tx.update(ref, { status: 'driver_claimed', driverId: request.auth.uid, isClaimed: true, driverName: request.auth.token.name || request.auth.token.email || null, updatedAt: new Date() });
      }
    });
    return { ok: true, operation, orderId: request.data.orderId };
  }

  if (operation === 'driver_assign') {
    const { db, ref, restaurantId } = await loadOrder(request, new Set(['Admin', 'SuperAdmin']));
    const driverId = request.data?.driverId;
    if (!isNonEmptyString(driverId)) throw new HttpsError('invalid-argument', 'driverId is required.');
    const driver = await getAuth().getUser(driverId);
    if (driver.customClaims?.role !== 'Delivery' || driver.customClaims?.restaurantId !== restaurantId) throw new HttpsError('permission-denied', 'Driver is not authorized for this restaurant.');
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError('not-found', 'Order not found.');
      const order = snap.data();
      if (order.restaurantId !== restaurantId) throw new HttpsError('permission-denied', 'Tenant mismatch.');
      if (!['preparing', 'driver_claimed'].includes(order.status)) throw new HttpsError('failed-precondition', 'Order cannot be assigned to a driver in its current state.');
      tx.update(ref, { driverId, isClaimed: true, driverName: driver.displayName || driver.email || null, status: 'driver_claimed', updatedAt: new Date() });
    });
    return { ok: true, operation, orderId: request.data.orderId, driverId };
  }

  if (operation === 'item_append') {
    const { db, ref, restaurantId } = await loadOrder(request, new Set(['Admin', 'SuperAdmin']));
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError('not-found', 'Order not found.');
      const order = snap.data();
      if (order.restaurantId !== restaurantId) throw new HttpsError('permission-denied', 'Tenant mismatch.');
      if (['completed', 'paid'].includes(order.status)) throw new HttpsError('failed-precondition', 'Completed or paid orders cannot be appended.');
      const appended = request.data?.items;
      if (!Array.isArray(appended) || appended.length === 0) throw new HttpsError('invalid-argument', 'items is required.');
      const combined = [...(Array.isArray(order.items) ? order.items : []), ...appended];
      const menuDataById = new Map();
      const ids = new Set(combined.map(item => item?.menuItemId));
      if ([...ids].some(id => !isNonEmptyString(id))) throw new HttpsError('invalid-argument', 'Every order item requires menuItemId.');
      for (const id of ids) {
        const menuSnap = await tx.get(db.doc(`restaurants/${restaurantId}/menuItems/${id}`));
        if (!menuSnap.exists) throw new HttpsError('not-found', `Menu item ${id} does not exist in this restaurant.`);
        menuDataById.set(id, { ...(menuSnap.data() || {}), __restaurantId: restaurantId });
      }
      const authoritative = buildAuthoritativeOrder(combined, menuDataById);
      tx.update(ref, { items: authoritative.items, subtotal: authoritative.subtotal, discountAmount: authoritative.discountAmount, totalAmount: authoritative.totalAmount, updatedAt: new Date() });
    });
    return { ok: true, operation, orderId: request.data.orderId };
  }

  if (operation === 'payment_flag') {
    const { db, ref, restaurantId } = await loadOrder(request, new Set(['Cashier', 'Admin', 'SuperAdmin']));
    if (request.data?.isPaid !== true) throw new HttpsError('invalid-argument', 'Only a true payment confirmation is accepted.');
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError('not-found', 'Order not found.');
      const order = snap.data();
      if (order.restaurantId !== restaurantId) throw new HttpsError('permission-denied', 'Tenant mismatch.');
      if (!['ready_for_payment', 'delivered_unpaid'].includes(order.status)) throw new HttpsError('failed-precondition', 'Order is not ready for payment confirmation.');
      tx.update(ref, { isPaid: true, paymentConfirmedBy: request.auth.uid, paymentConfirmedAt: new Date(), status: 'paid', updatedAt: new Date() });
    });
    return { ok: true, operation, orderId: request.data.orderId };
  }

  if (operation === 'note_add') {
    const { db, ref, restaurantId } = await loadOrder(request, new Set(['Kitchen', 'Cashier', 'Admin', 'SuperAdmin']));
    const note = request.data?.note;
    if (typeof note !== 'string' || note.trim().length === 0 || note.length > 500) throw new HttpsError('invalid-argument', 'A non-empty note up to 500 characters is required.');
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError('not-found', 'Order not found.');
      const order = snap.data();
      if (order.restaurantId !== restaurantId) throw new HttpsError('permission-denied', 'Tenant mismatch.');
      tx.update(ref, { staffNote: note.trim(), staffNoteBy: request.auth.uid, staffNoteAt: new Date(), updatedAt: new Date() });
    });
    return { ok: true, operation, orderId: request.data.orderId };
  }

  throw new HttpsError('invalid-argument', 'Unsupported order mutation operation.');
});

module.exports = { mutateOrder };
