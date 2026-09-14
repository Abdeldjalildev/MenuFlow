const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getOrderNumberDate, getNextOrderNumber } = require('./orderNumber');
const { generateGeminiResponse } = require('./aiProvider');

initializeApp();
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const ALLOWED_ROLES = new Set(['SuperAdmin', 'Admin', 'Cashier', 'Kitchen', 'Delivery', 'Waiter']);
const TENANT_STAFF_ROLES = new Set(['Cashier', 'Kitchen', 'Delivery', 'Waiter']);
const TRANSITIONS = { pending: new Set(['preparing']), preparing: new Set(['driver_claimed', 'ready_for_payment', 'ready']), driver_claimed: new Set(['ready_for_delivery']), ready: new Set(['ready_for_payment']), ready_for_payment: new Set(['ready_for_delivery', 'paid']), ready_for_delivery: new Set(['on_the_way']), on_the_way: new Set(['delivered_unpaid']), delivered_unpaid: new Set(['paid']), paid: new Set(['completed']), completed: new Set() };
const ROLE_TRANSITIONS = { Admin: null, SuperAdmin: null, Kitchen: new Set(['pending:preparing', 'preparing:ready', 'preparing:ready_for_payment']), Cashier: new Set(['ready_for_payment:paid', 'delivered_unpaid:paid', 'ready_for_payment:completed', 'paid:completed']), Delivery: new Set(['preparing:driver_claimed', 'driver_claimed:ready_for_delivery', 'ready_for_delivery:on_the_way', 'on_the_way:delivered_unpaid']) };
const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;

exports.provisionAuthzClaims = onCall(async (request) => {
  const caller = request.auth?.token; if (!caller) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const targetUid = request.data?.uid, role = request.data?.role, restaurantId = request.data?.restaurantId;
  if (!isNonEmptyString(targetUid) || !ALLOWED_ROLES.has(role)) throw new HttpsError('invalid-argument', 'A valid uid and role are required.');
  if (role !== 'SuperAdmin' && !isNonEmptyString(restaurantId)) throw new HttpsError('invalid-argument', 'Tenant roles require restaurantId.');
  const callerRole = caller.role, callerRestaurantId = caller.restaurantId;
  if (!ALLOWED_ROLES.has(callerRole)) throw new HttpsError('permission-denied', 'Caller has no valid authorization role.');
  if (role === 'SuperAdmin' && callerRole !== 'SuperAdmin') throw new HttpsError('permission-denied', 'Only an existing SuperAdmin can provision another SuperAdmin.');
  if (callerRole !== 'SuperAdmin') { if (callerRole !== 'Admin' || !TENANT_STAFF_ROLES.has(role)) throw new HttpsError('permission-denied', 'Caller cannot provision this role.'); if (callerRestaurantId !== restaurantId) throw new HttpsError('permission-denied', 'Cross-tenant claim provisioning is forbidden.'); }
  let targetUser; try { targetUser = await getAuth().getUser(targetUid); } catch (error) { if (error?.code === 'auth/user-not-found') throw new HttpsError('not-found', 'Target Firebase user does not exist.'); throw new HttpsError('internal', 'Unable to verify the target Firebase user.'); }
  if (targetUser.customClaims?.role === 'SuperAdmin' && callerRole !== 'SuperAdmin') throw new HttpsError('permission-denied', 'Tenant administrators cannot modify SuperAdmin claims.');
  const db = getFirestore();
  const claims = role === 'SuperAdmin' ? { role } : { role, restaurantId };

  // Admin authorization is membership-based. Establish the membership before
  // publishing the Admin claim so a successful provisioning cannot create an
  // Admin identity without its authoritative tenant membership.
  let adminMembershipCreated = false;
  if (role === 'Admin') {
    try {
      await db.doc(`restaurants/${restaurantId}/admins/${targetUid}`).set({
        adminUid: targetUid,
        createdAt: new Date(),
        createdBy: request.auth.uid
      });
      adminMembershipCreated = true;
    } catch (error) {
      console.error('Failed to create AdminMembership record:', error);
      throw new HttpsError('internal', 'Unable to establish Admin restaurant membership.');
    }
  }

  try {
    await getAuth().setCustomUserClaims(targetUid, claims);
  } catch (error) {
    if (adminMembershipCreated) {
      try { await db.doc(`restaurants/${restaurantId}/admins/${targetUid}`).delete(); }
      catch (cleanupError) { console.error('Failed to roll back AdminMembership after claim failure:', cleanupError); }
    }
    throw new HttpsError('internal', 'Unable to provision authorization claims.');
  }

  await db.collection('authz_claim_audit').add({ targetUid, role, restaurantId: role === 'SuperAdmin' ? null : restaurantId, actorUid: request.auth.uid, actorRole: callerRole, createdAt: new Date() }); return { ok: true };
});

/**
 * Check if an Admin actor has membership in a specific restaurant.
 * Admin authorization is authoritative only when the explicit membership
 * record exists at restaurants/{restaurantId}/admins/{adminUid}.
 */
async function isAdminOfRestaurant(adminUid, restaurantId, callerToken) {
  if (!isNonEmptyString(adminUid) || !isNonEmptyString(restaurantId)) return false;
  if (callerToken?.role === 'SuperAdmin') return true;
  if (callerToken?.role !== 'Admin') return false;
  const membershipSnap = await getFirestore()
    .doc(`restaurants/${restaurantId}/admins/${adminUid}`)
    .get();
  return membershipSnap.exists && membershipSnap.data()?.adminUid === adminUid;
}

exports.getAdminMemberships = onCall(async (request) => {
  const caller = request.auth?.token;
  if (!caller) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const targetUid = request.data?.uid || request.auth.uid;
  if (targetUid !== request.auth.uid && caller.role !== 'SuperAdmin') {
    throw new HttpsError('permission-denied', 'Only SuperAdmin can query other Admins\' memberships.');
  }
  if (caller.role !== 'SuperAdmin' && caller.role !== 'Admin') {
    throw new HttpsError('permission-denied', 'Only Admin actors can have restaurant memberships.');
  }
  const db = getFirestore();
  const restaurantsSnap = await db.collection('restaurants').get();
  const memberships = [];
  for (const restaurantDoc of restaurantsSnap.docs) {
    const membershipSnap = await db.doc(`restaurants/${restaurantDoc.id}/admins/${targetUid}`).get();
    if (membershipSnap.exists && membershipSnap.data()?.adminUid === targetUid) {
      memberships.push({ restaurantId: restaurantDoc.id, restaurantName: restaurantDoc.data()?.name || 'Unknown', ...membershipSnap.data() });
    }
  }
  return { memberships };
});

exports.addAdminMembership = onCall(async (request) => {
  const caller = request.auth?.token;
  if (!caller) throw new HttpsError('unauthenticated', 'Authentication is required.');
  if (caller.role !== 'SuperAdmin') throw new HttpsError('permission-denied', 'Only SuperAdmin can add Admin memberships.');
  const { adminUid, restaurantId } = request.data || {};
  if (!isNonEmptyString(adminUid) || !isNonEmptyString(restaurantId)) throw new HttpsError('invalid-argument', 'adminUid and restaurantId are required.');
  const db = getFirestore();
  let targetUser;
  try { targetUser = await getAuth().getUser(adminUid); } catch (error) { throw new HttpsError('not-found', 'Target Firebase user does not exist.'); }
  if (targetUser.customClaims?.role !== 'Admin') throw new HttpsError('failed-precondition', 'Target user is not an Admin.');
  const restaurantSnap = await db.doc(`restaurants/${restaurantId}`).get();
  if (!restaurantSnap.exists) throw new HttpsError('not-found', 'Restaurant does not exist.');
  await db.doc(`restaurants/${restaurantId}/admins/${adminUid}`).set({ adminUid, createdAt: new Date(), createdBy: request.auth.uid });
  await db.collection('admin_membership_audit').add({ action: 'add', adminUid, restaurantId, actorUid: request.auth.uid, createdAt: new Date() });
  return { ok: true, restaurantId, adminUid };
});

exports.removeAdminMembership = onCall(async (request) => {
  const caller = request.auth?.token;
  if (!caller) throw new HttpsError('unauthenticated', 'Authentication is required.');
  if (caller.role !== 'SuperAdmin') throw new HttpsError('permission-denied', 'Only SuperAdmin can remove Admin memberships.');
  const { adminUid, restaurantId } = request.data || {};
  if (!isNonEmptyString(adminUid) || !isNonEmptyString(restaurantId)) throw new HttpsError('invalid-argument', 'adminUid and restaurantId are required.');
  const db = getFirestore();
  let targetUser;
  try { targetUser = await getAuth().getUser(adminUid); } catch (error) { throw new HttpsError('not-found', 'Target Firebase user does not exist.'); }
  if (targetUser.customClaims?.role !== 'Admin') throw new HttpsError('failed-precondition', 'Target user is not an Admin.');
  const membershipRef = db.doc(`restaurants/${restaurantId}/admins/${adminUid}`);
  const membershipSnap = await membershipRef.get();
  if (!membershipSnap.exists) throw new HttpsError('not-found', 'Admin membership does not exist.');
  await membershipRef.delete();
  await db.collection('admin_membership_audit').add({ action: 'remove', adminUid, restaurantId, actorUid: request.auth.uid, createdAt: new Date() });
  return { ok: true, restaurantId, adminUid };
});

function assertTransition(role, from, to) { if (!TRANSITIONS[from]?.has(to)) throw new HttpsError('failed-precondition', `Illegal order transition: ${from} -> ${to}.`); if (role === 'Admin' || role === 'SuperAdmin') return; if (!ROLE_TRANSITIONS[role]?.has(`${from}:${to}`)) throw new HttpsError('permission-denied', `Role ${role} cannot perform ${from} -> ${to}.`); }
function normalizeIngredient(recipeIngredient) { const inventoryItemId = recipeIngredient?.inventoryItemId, quantity = Number(recipeIngredient?.quantity); if (!isNonEmptyString(inventoryItemId) || !Number.isFinite(quantity) || quantity <= 0) return null; return { inventoryItemId, quantity }; }
function normalizeOrderItems(items) { if (!Array.isArray(items) || items.length === 0 || items.length > 50) throw new HttpsError('invalid-argument', 'Order items must contain between 1 and 50 items.'); return items.map(item => { if (!item || typeof item !== 'object') throw new HttpsError('invalid-argument', 'Invalid order item.'); const quantity = Number(item.quantity ?? item.qty ?? 1), price = Number(item.price ?? item.unitPrice ?? 0); if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) throw new HttpsError('invalid-argument', 'Order item quantity and price must be valid numbers.'); return { ...item, quantity }; }); }
function normalizeDeliveryData(deliveryData) { if (deliveryData == null) return null; if (typeof deliveryData !== 'object') throw new HttpsError('invalid-argument', 'deliveryData must be an object or null.'); return { name: typeof deliveryData.name === 'string' ? deliveryData.name.slice(0, 120) : undefined, address: typeof deliveryData.address === 'string' ? deliveryData.address.slice(0, 500) : undefined, phone: typeof deliveryData.phone === 'string' ? deliveryData.phone.slice(0, 40) : undefined }; }

exports.createOrder = onCall(async (request) => {
  const auth = request.auth; if (!auth || auth.token?.firebase?.sign_in_provider !== 'anonymous') throw new HttpsError('unauthenticated', 'Anonymous customer authentication is required.');
  const restaurantId = request.data?.restaurantId, tableNumber = request.data?.tableNumber; const items = normalizeOrderItems(request.data?.items), deliveryData = normalizeDeliveryData(request.data?.deliveryData); const suppliedTotal = request.data?.totalAmount;
  if (!isNonEmptyString(restaurantId)) throw new HttpsError('invalid-argument', 'restaurantId is required.'); if (!isNonEmptyString(tableNumber) || tableNumber.length > 32) throw new HttpsError('invalid-argument', 'tableNumber must be a non-empty string of at most 32 characters.');
  const calculatedTotal = items.reduce((sum, item) => sum + Number(item.price ?? item.unitPrice ?? 0) * Number(item.quantity ?? 1), 0); const totalAmount = suppliedTotal == null ? calculatedTotal : Number(suppliedTotal); if (!Number.isFinite(totalAmount) || totalAmount < 0) throw new HttpsError('invalid-argument', 'totalAmount must be a non-negative number.');
  const db = getFirestore(); const orderRef = db.collection(`restaurants/${restaurantId}/orders`).doc(); const orderNumberDate = getOrderNumberDate(); const counterRef = db.doc(`restaurants/${restaurantId}/orderNumberCounters/${orderNumberDate}`); let orderNumber;
  await db.runTransaction(async tx => { const counterSnap = await tx.get(counterRef); const currentNextNumber = getNextOrderNumber(counterSnap.exists ? counterSnap.data() : null); orderNumber = currentNextNumber; tx.set(counterRef, { nextNumber: orderNumber + 1, date: orderNumberDate, updatedAt: new Date() }, { merge: true }); const shortId = auth.uid.slice(-4); tx.create(orderRef, { restaurantId, customerId: auth.uid, items, tableNumber, status: 'pending', totalAmount, customerName: deliveryData?.name || (tableNumber !== '0' ? `زبون طاولة #${tableNumber} (${shortId})` : `زبون خارجي (${shortId})`), customerPhone: deliveryData?.phone || '', deliveryAddress: deliveryData?.address || '', deliveryData, createdAt: new Date(), driverName: null, driverId: null, isClaimed: false, orderNumber, orderNumberDate }); });
  return { ok: true, orderId: orderRef.id, orderNumber, orderNumberDate };
});

exports.transitionOrder = onCall(async (request) => {
  const auth = request.auth; if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.'); const role = auth.token?.role, tokenRestaurantId = auth.token?.restaurantId; if (!ALLOWED_ROLES.has(role)) throw new HttpsError('permission-denied', 'A staff authorization role is required.'); if (role !== 'SuperAdmin' && role !== 'Admin' && !isNonEmptyString(tokenRestaurantId)) throw new HttpsError('permission-denied', 'Tenant authorization is required.');
  const orderId = request.data?.orderId, newStatus = request.data?.newStatus; if (!isNonEmptyString(orderId) || !isNonEmptyString(newStatus)) throw new HttpsError('invalid-argument', 'orderId and newStatus are required.'); const db = getFirestore();
  let effectiveRestaurant;
  if (role === 'SuperAdmin') {
    effectiveRestaurant = request.data?.restaurantId;
  } else if (role === 'Admin') {
    const targetRestaurant = isNonEmptyString(request.data?.restaurantId) ? request.data.restaurantId : tokenRestaurantId;
    if (!isNonEmptyString(targetRestaurant)) throw new HttpsError('invalid-argument', 'restaurantId is required.');
    if (!(await isAdminOfRestaurant(auth.uid, targetRestaurant, auth.token))) {
      throw new HttpsError('permission-denied', 'Admin has no membership in the requested restaurant.');
    }
    effectiveRestaurant = targetRestaurant;
  } else {
    effectiveRestaurant = tokenRestaurantId;
  }
  if (!isNonEmptyString(effectiveRestaurant)) throw new HttpsError('invalid-argument', 'restaurantId is required.'); const orderRef = db.doc(`restaurants/${effectiveRestaurant}/orders/${orderId}`);
  await db.runTransaction(async tx => { const orderSnap = await tx.get(orderRef); if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found.'); const order = orderSnap.data(); if (order.restaurantId !== effectiveRestaurant) throw new HttpsError('permission-denied', 'Tenant mismatch.'); const from = order.status; assertTransition(role, from, newStatus); const updates = { status: newStatus, updatedAt: new Date() }; if (newStatus === 'completed') updates.isPaid = true;
    if (newStatus === 'preparing' && !order.inventoryDeducted) { const deductions = new Map(); for (const item of Array.isArray(order.items) ? order.items : []) { const recipeId = item?.recipeId, qty = Number(item?.quantity ?? item?.qty ?? 1); if (!isNonEmptyString(recipeId)) throw new HttpsError('failed-precondition', 'Every order item must reference a recipe before preparation.'); if (!Number.isFinite(qty) || qty <= 0) throw new HttpsError('failed-precondition', 'Order item quantity is invalid.'); const recipeRef = db.doc(`restaurants/${effectiveRestaurant}/recipes/${recipeId}`), recipeSnap = await tx.get(recipeRef); if (!recipeSnap.exists) throw new HttpsError('failed-precondition', `Recipe ${recipeId} not found.`); const ingredients = Array.isArray(recipeSnap.data()?.recipeIngredients) ? recipeSnap.data().recipeIngredients : []; if (ingredients.length === 0) throw new HttpsError('failed-precondition', `Recipe ${recipeId} has no ingredients.`); for (const rawIngredient of ingredients) { const ingredient = normalizeIngredient(rawIngredient); if (!ingredient) throw new HttpsError('failed-precondition', `Recipe ${recipeId} has an invalid ingredient.`); deductions.set(ingredient.inventoryItemId, (deductions.get(ingredient.inventoryItemId) || 0) + ingredient.quantity * qty); } }
      const inventoryRefs = [...deductions.keys()].map(id => db.doc(`restaurants/${effectiveRestaurant}/inventory/${id}`)); const inventorySnaps = []; for (const ref of inventoryRefs) inventorySnaps.push(await tx.get(ref)); inventorySnaps.forEach((snap, index) => { if (!snap.exists) throw new HttpsError('failed-precondition', `Inventory item ${inventoryRefs[index].id} not found.`); const data = snap.data(), current = Number(data.currentQuantity ?? data.quantity ?? 0), required = deductions.get(inventoryRefs[index].id) || 0; if (!Number.isFinite(current) || current < required) throw new HttpsError('failed-precondition', `Insufficient stock for ${inventoryRefs[index].id}.`); }); inventorySnaps.forEach((snap, index) => { const ref = inventoryRefs[index], current = Number(snap.data().currentQuantity ?? snap.data().quantity ?? 0); const next = Number((current - (deductions.get(ref.id) || 0)).toFixed(4)); tx.update(ref, { currentQuantity: next, quantity: next, updatedAt: new Date() }); }); updates.inventoryDeducted = true; updates.inventoryDeductedAt = new Date(); }
    tx.update(orderRef, updates);
  });
  return { ok: true, orderId, status: newStatus };
});

async function assertAIAuthorization(request, restaurantId) {
  const auth = request.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  if (!isNonEmptyString(restaurantId)) throw new HttpsError('invalid-argument', 'restaurantId is required.');
  const signInProvider = auth.token?.firebase?.sign_in_provider;
  const role = auth.token?.role;
  if (signInProvider === 'anonymous') return;
  if (!ALLOWED_ROLES.has(role)) throw new HttpsError('permission-denied', 'A valid authorization role is required.');
  if (role === 'SuperAdmin') return;
  if (role === 'Admin') {
    if (await isAdminOfRestaurant(auth.uid, restaurantId, auth.token)) return;
    throw new HttpsError('permission-denied', 'Admin has no membership in the requested restaurant.');
  }
  if (auth.token?.restaurantId !== restaurantId) throw new HttpsError('permission-denied', 'Cross-tenant AI access is forbidden.');
}

exports.aiAssistant = onCall({ secrets: [geminiApiKey] }, async (request) => {
  const userPrompt = request.data?.userPrompt;
  const menuItems = request.data?.menuItems;
  const restaurantId = request.data?.restaurantId;
  await assertAIAuthorization(request, restaurantId);
  if (!isNonEmptyString(userPrompt) || !Array.isArray(menuItems)) throw new HttpsError('invalid-argument', 'userPrompt and menuItems are required.');
  const apiKey = geminiApiKey.value();
  if (!isNonEmptyString(apiKey)) throw new HttpsError('failed-precondition', 'AI service is not configured.');
  try {
    const text = await generateGeminiResponse(apiKey, userPrompt, menuItems, `${restaurantId}:${request.auth.uid}`);
    return { text };
  } catch (error) {
    if (error?.code === 'AI_RATE_LIMITED') throw new HttpsError('resource-exhausted', 'AI request rate limit exceeded.');
    if (typeof error?.message === 'string' && error.message.startsWith('AI ')) throw new HttpsError('invalid-argument', error.message);
    console.error('فشل الاتصال بخدمة الذكاء الاصطناعي:', error);
    throw new HttpsError('internal', 'Unable to reach the AI service.');
  }
});
