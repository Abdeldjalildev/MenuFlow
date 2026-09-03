import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-menuflow-phase3-gate5';
const RESTAURANT_A = 'restaurant-a';
const RESTAURANT_B = 'restaurant-b';
const CUSTOMER_A = 'customer-a';
let testEnv;

const orderRef = (db, restaurantId = RESTAURANT_A, id = 'order-a') => doc(db, 'restaurants', restaurantId, 'orders', id);
const tenantUser = (uid, restaurantId, role) => testEnv.authenticatedContext(uid, { restaurantId, role }).firestore();
const validOrder = (status = 'pending') => ({ restaurantId: RESTAURANT_A, customerId: CUSTOMER_A, items: [{ recipeId: 'recipe-a', quantity: 1 }], tableNumber: '1', status, totalAmount: 1200, createdAt: Timestamp.fromDate(new Date('2026-08-25T10:00:00Z')), driverId: null, driverName: null, isClaimed: false, isPaid: false });

async function seedOrder(status = 'pending', extra = {}) {
  await testEnv.withSecurityRulesDisabled(async context => { await setDoc(orderRef(context.firestore()), { ...validOrder(status), ...extra }); });
}

before(async () => {
  testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => { await testEnv.clearFirestore(); });
after(async () => { await testEnv.cleanup(); });

test('Gate 5: every supported lifecycle transition is explicitly allowed to its responsible role', async () => {
  const cases = [
    ['Kitchen', 'kitchen-a', 'pending', 'preparing'], ['Kitchen', 'kitchen-a', 'preparing', 'ready'], ['Kitchen', 'kitchen-a', 'preparing', 'ready_for_payment'],
    ['Delivery', 'delivery-a', 'preparing', 'driver_claimed'], ['Delivery', 'delivery-a', 'driver_claimed', 'ready_for_delivery'], ['Delivery', 'delivery-a', 'ready_for_delivery', 'on_the_way'], ['Delivery', 'delivery-a', 'on_the_way', 'delivered_unpaid'],
    ['Cashier', 'cashier-a', 'ready_for_payment', 'paid'], ['Cashier', 'cashier-a', 'delivered_unpaid', 'paid'], ['Cashier', 'cashier-a', 'paid', 'completed'],
  ];
  for (const [role, uid, from, to] of cases) {
    await testEnv.clearFirestore(); await seedOrder(from);
    const db = tenantUser(uid, RESTAURANT_A, role); const updates = { status: to, updatedAt: Timestamp.now() };
    if (role === 'Delivery' && from === 'preparing') Object.assign(updates, { driverId: uid, driverName: 'Delivery A', isClaimed: true });
    if (role === 'Cashier') updates.isPaid = true;
    await assertSucceeds(updateDoc(orderRef(db), updates));
  }
});

test('Gate 5: illegal lifecycle transitions are rejected for every operational role', async () => {
  for (const [role, uid] of [['Kitchen', 'kitchen-a'], ['Cashier', 'cashier-a'], ['Delivery', 'delivery-a'], ['Admin', 'admin-a']]) {
    await testEnv.clearFirestore(); await seedOrder('pending');
    await assertFails(updateDoc(orderRef(tenantUser(uid, RESTAURANT_A, role)), { status: 'paid', updatedAt: Timestamp.now() }));
  }
});

test('Gate 5: role boundaries reject otherwise-valid transitions owned by another role', async () => {
  const cases = [['Kitchen', 'kitchen-a', 'ready_for_payment', 'paid'], ['Cashier', 'cashier-a', 'preparing', 'ready'], ['Delivery', 'delivery-a', 'ready_for_payment', 'paid']];
  for (const [role, uid, from, to] of cases) {
    await testEnv.clearFirestore(); await seedOrder(from);
    await assertFails(updateDoc(orderRef(tenantUser(uid, RESTAURANT_A, role)), { status: to, updatedAt: Timestamp.now(), ...(role === 'Cashier' ? { isPaid: true } : {}) }));
  }
});

test('Gate 5: kitchen cannot mutate financial, identity, driver, or inventory flags during a status change', async () => {
  await seedOrder('pending'); const ref = orderRef(tenantUser('kitchen-a', RESTAURANT_A, 'Kitchen'));
  await assertFails(updateDoc(ref, { status: 'preparing', totalAmount: 1, updatedAt: Timestamp.now() }));
  await assertFails(updateDoc(ref, { status: 'preparing', inventoryDeducted: true, updatedAt: Timestamp.now() }));
  await assertFails(updateDoc(ref, { status: 'preparing', customerId: 'forged', updatedAt: Timestamp.now() }));
});

test('Gate 5: cashier can only mutate payment state while completing a legal payment transition', async () => {
  await seedOrder('ready_for_payment'); const db = tenantUser('cashier-a', RESTAURANT_A, 'Cashier'); const ref = orderRef(db);
  await assertSucceeds(updateDoc(ref, { status: 'paid', isPaid: true, updatedAt: Timestamp.now() }));
  await testEnv.clearFirestore(); await seedOrder('ready_for_payment');
  await assertFails(updateDoc(ref, { status: 'paid', isPaid: false, updatedAt: Timestamp.now() }));
  await assertFails(updateDoc(ref, { status: 'paid', isPaid: true, totalAmount: 1, updatedAt: Timestamp.now() }));
});

test('Gate 5: delivery claim binds the driver to the authenticated UID', async () => {
  await seedOrder('preparing'); const db = tenantUser('delivery-a', RESTAURANT_A, 'Delivery'); const ref = orderRef(db);
  await assertSucceeds(updateDoc(ref, { status: 'driver_claimed', driverId: 'delivery-a', driverName: 'Delivery A', isClaimed: true, updatedAt: Timestamp.now() }));
  await testEnv.clearFirestore(); await seedOrder('preparing');
  await assertFails(updateDoc(ref, { status: 'driver_claimed', driverId: 'other-driver', driverName: 'Other', isClaimed: true, updatedAt: Timestamp.now() }));
});

test('Gate 5: tenant, customer, and creation identity fields are immutable', async () => {
  await seedOrder('preparing'); const ref = orderRef(tenantUser('admin-a', RESTAURANT_A, 'Admin'));
  await assertFails(updateDoc(ref, { status: 'ready', restaurantId: RESTAURANT_B, updatedAt: Timestamp.now() }));
  await assertFails(updateDoc(ref, { status: 'ready', customerId: 'other-customer', updatedAt: Timestamp.now() }));
  await assertFails(updateDoc(ref, { status: 'ready', createdAt: Timestamp.now(), updatedAt: Timestamp.now() }));
  await assertFails(updateDoc(ref, { status: 'ready', items: [{ recipeId: 'forged', quantity: 99 }], updatedAt: Timestamp.now() }));
});

test('Gate 5: tenant isolation remains enforced for order reads and writes', async () => {
  await testEnv.withSecurityRulesDisabled(async context => { await setDoc(orderRef(context.firestore(), RESTAURANT_B, 'order-b'), { ...validOrder(), restaurantId: RESTAURANT_B, customerId: 'customer-b' }); });
  const db = tenantUser('admin-a', RESTAURANT_A, 'Admin');
  await assertFails(getDoc(orderRef(db, RESTAURANT_B, 'order-b')));
  await assertFails(updateDoc(orderRef(db, RESTAURANT_B, 'order-b'), { status: 'preparing', updatedAt: Timestamp.now() }));
});

test('Gate 5: legacy top-level order paths remain inaccessible', async () => {
  const db = tenantUser('admin-a', RESTAURANT_A, 'Admin');
  await assertFails(getDoc(doc(db, 'orders', 'legacy-order')));
  await assertFails(setDoc(doc(db, 'orders', 'legacy-order'), validOrder()));
});

test('Gate 5: inventory deduction is fail-closed, transactional, and idempotent by source contract', async () => {
  const source = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');
  assert.match(source, /newStatus === 'preparing' && !order\.inventoryDeducted/);
  assert.match(source, /Every order item must reference a recipe before preparation/);
  assert.match(source, /Insufficient stock/); assert.match(source, /await db\.runTransaction\(async tx/);
  assert.match(source, /updates\.inventoryDeducted = true/); assert.match(source, /updates\.inventoryDeductedAt = new Date\(\)/); assert.match(source, /tx\.update\(orderRef, updates\)/);
});

test('Gate 5: concurrent order numbering remains transaction-backed and isolated by restaurant/day', async () => {
  const source = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');
  const helper = await readFile(new URL('../functions/orderNumber.js', import.meta.url), 'utf8');
  assert.match(source, /orderNumberCounters\/\$\{orderNumberDate\}/); assert.match(source, /const counterSnap = await tx\.get\(counterRef\)/);
  assert.match(source, /tx\.set\(counterRef, \{ nextNumber: orderNumber \+ 1/); assert.match(source, /tx\.create\(orderRef, \{/);
  assert.match(helper, /timeZone: ORDER_NUMBER_TIME_ZONE/); assert.match(helper, /counterData == null \? 1 : Number/);
});
