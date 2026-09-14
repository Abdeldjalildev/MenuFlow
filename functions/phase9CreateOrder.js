const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { getOrderNumberDate, getNextOrderNumber } = require('./orderNumber');
const { buildAuthoritativeOrder, isNonEmptyString } = require('./orderPricing');

const legacyFunctions = require('./index');

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

const createOrder = onCall(async request => {
  const auth = request.auth;
  if (!auth || auth.token?.firebase?.sign_in_provider !== 'anonymous') {
    throw new HttpsError('unauthenticated', 'Anonymous customer authentication is required.');
  }

  const restaurantId = request.data?.restaurantId;
  const tableNumber = request.data?.tableNumber;
  const items = request.data?.items;
  const deliveryData = normalizeDeliveryData(request.data?.deliveryData);

  if (!isNonEmptyString(restaurantId)) {
    throw new HttpsError('invalid-argument', 'restaurantId is required.');
  }
  if (!isNonEmptyString(tableNumber) || tableNumber.length > 32) {
    throw new HttpsError('invalid-argument', 'tableNumber must be a non-empty string of at most 32 characters.');
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new HttpsError('invalid-argument', 'Order items must contain between 1 and 50 items.');
  }

  const db = getFirestore();
  const restaurantRef = db.doc(`restaurants/${restaurantId}`);
  const menuRefs = new Map();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !isNonEmptyString(item.menuItemId)) {
      throw new HttpsError('invalid-argument', 'Each order item requires menuItemId.');
    }
    if (!menuRefs.has(item.menuItemId)) {
      menuRefs.set(item.menuItemId, db.doc(`restaurants/${restaurantId}/menuItems/${item.menuItemId}`));
    }
  }

  const orderRef = db.collection(`restaurants/${restaurantId}/orders`).doc();
  const orderNumberDate = getOrderNumberDate();
  const counterRef = db.doc(`restaurants/${restaurantId}/orderNumberCounters/${orderNumberDate}`);
  let orderNumber;

  await db.runTransaction(async tx => {
    const restaurantSnap = await tx.get(restaurantRef);
    if (!restaurantSnap.exists) {
      throw new HttpsError('not-found', 'Restaurant does not exist.');
    }

    const menuDataById = new Map();
    for (const [menuItemId, menuRef] of menuRefs) {
      const menuSnap = await tx.get(menuRef);
      if (!menuSnap.exists) {
        throw new HttpsError('not-found', `Menu item ${menuItemId} does not exist in this restaurant.`);
      }
      const data = menuSnap.data() || {};
      menuDataById.set(menuItemId, { ...data, __restaurantId: restaurantId });
    }

    const authoritative = buildAuthoritativeOrder(items, menuDataById);
    const counterSnap = await tx.get(counterRef);
    orderNumber = getNextOrderNumber(counterSnap.exists ? counterSnap.data() : null);

    tx.set(counterRef, {
      nextNumber: orderNumber + 1,
      date: orderNumberDate,
      updatedAt: new Date(),
    }, { merge: true });

    const shortId = auth.uid.slice(-4);
    tx.create(orderRef, {
      restaurantId,
      customerId: auth.uid,
      items: authoritative.items,
      tableNumber,
      status: 'pending',
      subtotal: authoritative.subtotal,
      discountAmount: authoritative.discountAmount,
      totalAmount: authoritative.totalAmount,
      customerName: deliveryData?.name || (tableNumber !== '0' ? `زبون طاولة #${tableNumber} (${shortId})` : `زبون خارجي (${shortId})`),
      customerPhone: deliveryData?.phone || '',
      deliveryAddress: deliveryData?.address || '',
      deliveryData,
      createdAt: new Date(),
      driverName: null,
      driverId: null,
      isClaimed: false,
      orderNumber,
      orderNumberDate,
    });
  });

  return {
    ok: true,
    orderId: orderRef.id,
    orderNumber,
    orderNumberDate,
    subtotal: undefined,
  };
});

legacyFunctions.createOrder = createOrder;
module.exports = legacyFunctions;
