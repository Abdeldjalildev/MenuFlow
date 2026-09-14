const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { getOrderNumberDate, getNextOrderNumber } = require('./orderNumber');
const { buildAuthoritativeOrder, isNonEmptyString } = require('./orderPricing');
const { createOperationalNotification } = require('./operationalNotifications');

const STAFF_ROLES = new Set(['Waiter', 'Admin', 'SuperAdmin']);

async function assertCreationActor(request, restaurantId, orderSource) {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  if (orderSource === 'customer') {
    if (auth.token?.firebase?.sign_in_provider !== 'anonymous') throw new HttpsError('unauthenticated', 'Anonymous customer authentication is required.');
    return { customerId: auth.uid, actorUid: auth.uid };
  }
  if (orderSource !== 'waiter') throw new HttpsError('invalid-argument', 'orderSource must be customer or waiter.');
  const role = auth.token?.role;
  if (!STAFF_ROLES.has(role)) throw new HttpsError('permission-denied', 'Only a waiter or authorized administrator can create waiter orders.');
  if (role === 'Waiter' && auth.token?.restaurantId !== restaurantId) throw new HttpsError('permission-denied', 'Waiter is not authorized for this restaurant.');
  if (role === 'Admin') {
    const membership = await getFirestore().doc(`restaurants/${restaurantId}/admins/${auth.uid}`).get();
    if (!membership.exists || membership.data()?.adminUid !== auth.uid) throw new HttpsError('permission-denied', 'Admin has no membership in this restaurant.');
  }
  return { waiterId: auth.uid, waiterName: auth.token?.name || auth.token?.email || undefined, actorUid: auth.uid };
}
function normalizeDeliveryData(deliveryData) {
  if (deliveryData == null) return null;
  if (typeof deliveryData !== 'object' || Array.isArray(deliveryData)) throw new HttpsError('invalid-argument', 'deliveryData must be an object or null.');
  return { name: typeof deliveryData.name === 'string' ? deliveryData.name.slice(0, 120) : undefined, address: typeof deliveryData.address === 'string' ? deliveryData.address.slice(0, 500) : undefined, phone: typeof deliveryData.phone === 'string' ? deliveryData.phone.slice(0, 40) : undefined };
}
function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) throw new HttpsError('invalid-argument', 'Order items must contain between 1 and 50 items.');
  return items.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !isNonEmptyString(item.menuItemId)) throw new HttpsError('invalid-argument', 'Each order item requires menuItemId.');
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) throw new HttpsError('invalid-argument', 'Order item quantity must be an integer from 1 to 100.');
    return { menuItemId: item.menuItemId, quantity, modifiers: Array.isArray(item.modifiers) ? item.modifiers : [], note: typeof item.note === 'string' ? item.note.slice(0, 500) : undefined };
  });
}

const createOrder = onCall(async request => {
  const restaurantId = request.data?.restaurantId;
  const tableNumber = request.data?.tableNumber;
  const orderSource = request.data?.orderSource || 'customer';
  const mutationId = request.data?.mutationId;
  if (!isNonEmptyString(restaurantId)) throw new HttpsError('invalid-argument', 'restaurantId is required.');
  if (!isNonEmptyString(tableNumber) || tableNumber.trim().length > 32) throw new HttpsError('invalid-argument', 'tableNumber must be a non-empty string of at most 32 characters.');
  if (orderSource === 'waiter' && tableNumber.trim() === '0') throw new HttpsError('invalid-argument', 'Waiter orders require a real table number.');
  if (mutationId !== undefined && (!isNonEmptyString(mutationId) || mutationId.length > 128)) throw new HttpsError('invalid-argument', 'mutationId must be a non-empty string of at most 128 characters.');

  const actor = await assertCreationActor(request, restaurantId, orderSource);
  const items = normalizeItems(request.data?.items);
  const deliveryData = normalizeDeliveryData(request.data?.deliveryData);
  const db = getFirestore();
  const restaurantRef = db.doc(`restaurants/${restaurantId}`);
  const receiptRef = mutationId ? db.doc(`restaurants/${restaurantId}/orderMutationReceipts/${mutationId}`) : null;
  const menuRefs = new Map();
  for (const item of items) if (!menuRefs.has(item.menuItemId)) menuRefs.set(item.menuItemId, db.doc(`restaurants/${restaurantId}/menuItems/${item.menuItemId}`));
  const orderRef = db.collection(`restaurants/${restaurantId}/orders`).doc();
  const orderNumberDate = getOrderNumberDate();
  const counterRef = db.doc(`restaurants/${restaurantId}/orderNumberCounters/${orderNumberDate}`);
  let result;

  await db.runTransaction(async tx => {
    const restaurantSnap = await tx.get(restaurantRef);
    if (!restaurantSnap.exists) throw new HttpsError('not-found', 'Restaurant does not exist.');
    if (receiptRef) {
      const receiptSnap = await tx.get(receiptRef);
      if (receiptSnap.exists) {
        const receipt = receiptSnap.data() || {};
        if (receipt.actorUid !== actor.actorUid || receipt.orderSource !== orderSource) throw new HttpsError('failed-precondition', 'Mutation ID has already been used by another actor.');
        result = { orderId: receipt.orderId, orderNumber: receipt.orderNumber, orderNumberDate: receipt.orderNumberDate, subtotal: receipt.subtotal, discountAmount: receipt.discountAmount, totalAmount: receipt.totalAmount, isReplay: true };
        return;
      }
    }
    const menuDataById = new Map();
    for (const [menuItemId, menuRef] of menuRefs) {
      const menuSnap = await tx.get(menuRef);
      if (!menuSnap.exists) throw new HttpsError('not-found', `Menu item ${menuItemId} does not exist in this restaurant.`);
      menuDataById.set(menuItemId, { ...(menuSnap.data() || {}), __restaurantId: restaurantId });
    }
    const authoritative = buildAuthoritativeOrder(items, menuDataById);
    const counterSnap = await tx.get(counterRef);
    const orderNumber = getNextOrderNumber(counterSnap.exists ? counterSnap.data() : null);
    tx.set(counterRef, { nextNumber: orderNumber + 1, date: orderNumberDate, updatedAt: new Date() }, { merge: true });
    const order = { restaurantId, orderSource, ...(actor.customerId ? { customerId: actor.customerId } : {}), ...(actor.waiterId ? { waiterId: actor.waiterId, waiterName: actor.waiterName || null } : {}), items: authoritative.items, tableNumber: tableNumber.trim(), status: 'pending', subtotal: authoritative.subtotal, discountAmount: authoritative.discountAmount, totalAmount: authoritative.totalAmount, customerName: typeof deliveryData?.name === 'string' ? deliveryData.name : '', customerPhone: deliveryData?.phone || '', deliveryAddress: deliveryData?.address || '', deliveryData, createdAt: new Date(), driverName: null, driverId: null, isClaimed: false, orderNumber, orderNumberDate };
    tx.create(orderRef, order);
    if (receiptRef) tx.create(receiptRef, { orderId: orderRef.id, orderNumber, orderNumberDate, subtotal: authoritative.subtotal, discountAmount: authoritative.discountAmount, totalAmount: authoritative.totalAmount, actorUid: actor.actorUid, orderSource, createdAt: new Date() });
    result = { orderId: orderRef.id, orderNumber, order, subtotal: authoritative.subtotal, discountAmount: authoritative.discountAmount, totalAmount: authoritative.totalAmount, isReplay: false };
  });

  if (!result.isReplay) {
    await createOperationalNotification(db, {
      restaurantId,
      type: 'new_order',
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      status: 'pending',
      title: 'New order',
      message: `Order #${result.orderNumber} is ready for restaurant operations.`,
      eventId: `new-order-${result.orderId}`,
    });
  }
  return { ok: true, orderId: result.orderId, orderNumber: result.orderNumber, orderNumberDate: result.orderNumberDate || orderNumberDate, subtotal: result.subtotal, discountAmount: result.discountAmount, totalAmount: result.totalAmount, orderSource };
});

module.exports = { createOrder };
