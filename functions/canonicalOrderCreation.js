const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { getOrderNumberDate, getNextOrderNumber } = require('./orderNumber');
const { buildAuthoritativeOrder, isNonEmptyString } = require('./orderPricing');

const STAFF_ROLES = new Set(['Waiter', 'Admin', 'SuperAdmin']);

async function assertCreationActor(request, restaurantId, orderSource) {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');

  if (orderSource === 'customer') {
    if (auth.token?.firebase?.sign_in_provider !== 'anonymous') {
      throw new HttpsError('unauthenticated', 'Anonymous customer authentication is required.');
    }
    return { customerId: auth.uid };
  }

  if (orderSource !== 'waiter') {
    throw new HttpsError('invalid-argument', 'orderSource must be customer or waiter.');
  }

  const role = auth.token?.role;
  if (!STAFF_ROLES.has(role)) {
    throw new HttpsError('permission-denied', 'Only a waiter or authorized administrator can create waiter orders.');
  }

  if (role === 'Waiter' && auth.token?.restaurantId !== restaurantId) {
    throw new HttpsError('permission-denied', 'Waiter is not authorized for this restaurant.');
  }

  if (role === 'Admin') {
    const membership = await getFirestore().doc(`restaurants/${restaurantId}/admins/${auth.uid}`).get();
    if (!membership.exists || membership.data()?.adminUid !== auth.uid) {
      throw new HttpsError('permission-denied', 'Admin has no membership in this restaurant.');
    }
  }

  return { waiterId: auth.uid, waiterName: auth.token?.name || auth.token?.email || undefined };
}

function normalizeDeliveryData(deliveryData) {
  if (deliveryData == null) return null;
  if (typeof deliveryData !== 'object' || Array.isArray(deliveryData)) {
    throw new HttpsError('invalid-argument', 'deliveryData must be an object or null.');
  }
  return {
    name: typeof deliveryData.name === 'string' ? deliveryData.name.slice(0, 120) : undefined,
    address: typeof deliveryData.address === 'string' ? deliveryData.address.slice(0, 500) : undefined,
    phone: typeof deliveryData.phone === 'string' ? deliveryData.phone.slice(0, 40) : undefined,
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new HttpsError('invalid-argument', 'Order items must contain between 1 and 50 items.');
  }
  return items.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !isNonEmptyString(item.menuItemId)) {
      throw new HttpsError('invalid-argument', 'Each order item requires menuItemId.');
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
      throw new HttpsError('invalid-argument', 'Order item quantity must be an integer from 1 to 100.');
    }
    return {
      menuItemId: item.menuItemId,
      quantity,
      modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
      note: typeof item.note === 'string' ? item.note.slice(0, 500) : undefined,
    };
  });
}

const createOrder = onCall(async request => {
  const restaurantId = request.data?.restaurantId;
  const tableNumber = request.data?.tableNumber;
  const orderSource = request.data?.orderSource || 'customer';
  if (!isNonEmptyString(restaurantId)) throw new HttpsError('invalid-argument', 'restaurantId is required.');
  if (!isNonEmptyString(tableNumber) || tableNumber.length > 32) throw new HttpsError('invalid-argument', 'tableNumber must be a non-empty string of at most 32 characters.');

  const actor = await assertCreationActor(request, restaurantId, orderSource);
  const items = normalizeItems(request.data?.items);
  const deliveryData = normalizeDeliveryData(request.data?.deliveryData);
  const db = getFirestore();
  const restaurantRef = db.doc(`restaurants/${restaurantId}`);
  const menuRefs = new Map();
  for (const item of items) {
    if (!menuRefs.has(item.menuItemId)) menuRefs.set(item.menuItemId, db.doc(`restaurants/${restaurantId}/menuItems/${item.menuItemId}`));
  }

  const orderRef = db.collection(`restaurants/${restaurantId}/orders`).doc();
  const orderNumberDate = getOrderNumberDate();
  const counterRef = db.doc(`restaurants/${restaurantId}/orderNumberCounters/${orderNumberDate}`);
  let result;

  await db.runTransaction(async tx => {
    const restaurantSnap = await tx.get(restaurantRef);
    if (!restaurantSnap.exists) throw new HttpsError('not-found', 'Restaurant does not exist.');
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

    const order = {
      restaurantId,
      orderSource,
      ...(actor.customerId ? { customerId: actor.customerId } : {}),
      ...(actor.waiterId ? { waiterId: actor.waiterId, waiterName: actor.waiterName || null } : {}),
      items: authoritative.items,
      tableNumber,
      status: 'pending',
      subtotal: authoritative.subtotal,
      discountAmount: authoritative.discountAmount,
      totalAmount: authoritative.totalAmount,
      customerName: typeof deliveryData?.name === 'string' ? deliveryData.name : '',
      customerPhone: deliveryData?.phone || '',
      deliveryAddress: deliveryData?.address || '',
      deliveryData,
      createdAt: new Date(),
      driverName: null,
      driverId: null,
      isClaimed: false,
      orderNumber,
      orderNumberDate,
    };
    tx.create(orderRef, order);
    result = { orderNumber, order, subtotal: authoritative.subtotal, discountAmount: authoritative.discountAmount, totalAmount: authoritative.totalAmount };
  });

  return { ok: true, orderId: orderRef.id, orderNumber: result.orderNumber, orderNumberDate, subtotal: result.subtotal, discountAmount: result.discountAmount, totalAmount: result.totalAmount, orderSource };
});

module.exports = { createOrder };
