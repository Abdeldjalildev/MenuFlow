import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc } from 'firebase/firestore';
import { readFile } from 'node:fs/promises';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';

const PROJECT_ID = 'demo-menuflow-phase5-gate2';
const REGION = 'us-central1';
const RESTAURANT_A = 'restaurant-a';

let adminApp;
let adminAuth;
let adminDb;
const clientApps = [];

const createClient = async (name, mode = 'anonymous') => {
  const app = initializeApp({ apiKey: 'demo-api-key', projectId: PROJECT_ID, appId: `gate2-${name}` }, name);
  clientApps.push(app);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, REGION);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  if (mode === 'anonymous') await signInAnonymously(auth);
  return { app, auth, db, functions };
};

const callable = (functions, name) => httpsCallable(functions, name);
const orderRef = (orderId) => doc(adminDb, `restaurants/${RESTAURANT_A}/orders/${orderId}`);
const seed = async (path, data) => setDoc(doc(adminDb, path), data);

const createStaffClient = async (name, role, restaurantId = RESTAURANT_A) => {
  const user = await adminAuth.createUser({ displayName: name });
  const token = await adminAuth.createCustomToken(user.uid, { role, restaurantId });
  const client = await createClient(name, 'staff');
  await signInWithCustomToken(client.auth, token);
  return client;
};

before(async () => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  process.env.GCLOUD_PROJECT = PROJECT_ID;
  adminApp = getAdminApps().length ? getAdminApps()[0] : initializeAdminApp({ projectId: PROJECT_ID });
  adminAuth = getAdminAuth(adminApp);
  adminDb = getAdminFirestore(adminApp);
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /match \/restaurants\/{restaurantId}/);
});

beforeEach(async () => {
  const orders = await adminDb.collection('restaurants').doc(RESTAURANT_A).collection('orders').get();
  await Promise.all(orders.docs.map((item) => item.ref.delete()));
  const recipes = await adminDb.collection('restaurants').doc(RESTAURANT_A).collection('recipes').get();
  await Promise.all(recipes.docs.map((item) => item.ref.delete()));
  const inventory = await adminDb.collection('restaurants').doc(RESTAURANT_A).collection('inventory').get();
  await Promise.all(inventory.docs.map((item) => item.ref.delete()));
  const counters = await adminDb.collection('restaurants').doc(RESTAURANT_A).collection('orderNumberCounters').get();
  await Promise.all(counters.docs.map((item) => item.ref.delete()));
});

after(async () => {
  await Promise.all(clientApps.map(deleteApp));
  await adminApp?.delete();
});

test('Gate 2: createOrder creates a tenant-scoped pending order with server-assigned daily number', async () => {
  const customer = await createClient('customer-create');
  const result = await callable(customer.functions, 'createOrder')({ restaurantId: RESTAURANT_A, tableNumber: '7', items: [{ menuItemId: 'meal-a', recipeId: 'recipe-a', price: 1200, quantity: 2 }], totalAmount: 2400 });
  assert.equal(result.data.ok, true);
  const order = (await getDoc(orderRef(result.data.orderId))).data();
  assert.equal(order.restaurantId, RESTAURANT_A);
  assert.equal(order.customerId, customer.auth.currentUser.uid);
  assert.equal(order.status, 'pending');
  assert.equal(order.orderNumber, result.data.orderNumber);
  assert.equal(order.orderNumberDate, result.data.orderNumberDate);
  assert.equal(order.orderNumber, 1);
});

test('Gate 2: illegal and role-incompatible lifecycle transitions are rejected by the callable', async () => {
  await seed(`restaurants/${RESTAURANT_A}/orders/order-a`, { restaurantId: RESTAURANT_A, customerId: 'customer-a', items: [{ recipeId: 'recipe-a', quantity: 1 }], tableNumber: '1', status: 'pending', totalAmount: 1200, inventoryDeducted: false });
  const cashier = await createStaffClient('cashier-illegal', 'Cashier');
  await assert.rejects(() => callable(cashier.functions, 'transitionOrder')({ orderId: 'order-a', newStatus: 'paid', restaurantId: RESTAURANT_A }), (error) => error.code === 'functions/failed-precondition');
  const kitchen = await createStaffClient('kitchen-valid', 'Kitchen');
  await assert.rejects(() => callable(kitchen.functions, 'transitionOrder')({ orderId: 'order-a', newStatus: 'paid', restaurantId: RESTAURANT_A }), (error) => error.code === 'functions/failed-precondition');
});

test('Gate 2: preparation atomically deducts inventory and marks the order once', async () => {
  await seed(`restaurants/${RESTAURANT_A}/recipes/recipe-a`, { recipeIngredients: [{ inventoryItemId: 'flour', quantity: 2 }] });
  await seed(`restaurants/${RESTAURANT_A}/inventory/flour`, { currentQuantity: 10, quantity: 10 });
  await seed(`restaurants/${RESTAURANT_A}/orders/order-a`, { restaurantId: RESTAURANT_A, customerId: 'customer-a', items: [{ recipeId: 'recipe-a', quantity: 3 }], tableNumber: '1', status: 'pending', totalAmount: 1200, inventoryDeducted: false });
  const kitchen = await createStaffClient('kitchen-stock', 'Kitchen');
  const result = await callable(kitchen.functions, 'transitionOrder')({ orderId: 'order-a', newStatus: 'preparing', restaurantId: RESTAURANT_A });
  assert.equal(result.data.status, 'preparing');
  const order = (await getDoc(orderRef('order-a'))).data();
  const inventory = (await getDoc(doc(adminDb, `restaurants/${RESTAURANT_A}/inventory/flour`))).data();
  assert.equal(order.inventoryDeducted, true);
  assert.equal(inventory.currentQuantity, 4);
  assert.equal(inventory.quantity, 4);
});

test('Gate 2: concurrent preparation attempts deduct inventory only once', async () => {
  await seed(`restaurants/${RESTAURANT_A}/recipes/recipe-a`, { recipeIngredients: [{ inventoryItemId: 'flour', quantity: 2 }] });
  await seed(`restaurants/${RESTAURANT_A}/inventory/flour`, { currentQuantity: 10, quantity: 10 });
  await seed(`restaurants/${RESTAURANT_A}/orders/order-a`, { restaurantId: RESTAURANT_A, customerId: 'customer-a', items: [{ recipeId: 'recipe-a', quantity: 3 }], tableNumber: '1', status: 'pending', totalAmount: 1200, inventoryDeducted: false });
  const kitchen = await createStaffClient('kitchen-concurrent', 'Kitchen');
  const transition = callable(kitchen.functions, 'transitionOrder');
  const results = await Promise.allSettled([
    transition({ orderId: 'order-a', newStatus: 'preparing', restaurantId: RESTAURANT_A }),
    transition({ orderId: 'order-a', newStatus: 'preparing', restaurantId: RESTAURANT_A }),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  const order = (await getDoc(orderRef('order-a'))).data();
  const inventory = (await getDoc(doc(adminDb, `restaurants/${RESTAURANT_A}/inventory/flour`))).data();
  assert.equal(order.status, 'preparing');
  assert.equal(order.inventoryDeducted, true);
  assert.equal(inventory.currentQuantity, 4);
});

test('Gate 2: insufficient stock fails closed without changing order or inventory', async () => {
  await seed(`restaurants/${RESTAURANT_A}/recipes/recipe-a`, { recipeIngredients: [{ inventoryItemId: 'flour', quantity: 2 }] });
  await seed(`restaurants/${RESTAURANT_A}/inventory/flour`, { currentQuantity: 5, quantity: 5 });
  await seed(`restaurants/${RESTAURANT_A}/orders/order-a`, { restaurantId: RESTAURANT_A, customerId: 'customer-a', items: [{ recipeId: 'recipe-a', quantity: 3 }], tableNumber: '1', status: 'pending', totalAmount: 1200, inventoryDeducted: false });
  const kitchen = await createStaffClient('kitchen-insufficient', 'Kitchen');
  await assert.rejects(() => callable(kitchen.functions, 'transitionOrder')({ orderId: 'order-a', newStatus: 'preparing', restaurantId: RESTAURANT_A }), (error) => error.code === 'functions/failed-precondition');
  const order = (await getDoc(orderRef('order-a'))).data();
  const inventory = (await getDoc(doc(adminDb, `restaurants/${RESTAURANT_A}/inventory/flour`))).data();
  assert.equal(order.status, 'pending');
  assert.equal(order.inventoryDeducted, false);
  assert.equal(inventory.currentQuantity, 5);
});

test('Gate 2: missing recipe and missing recipe reference fail closed', async () => {
  await seed(`restaurants/${RESTAURANT_A}/orders/order-a`, { restaurantId: RESTAURANT_A, customerId: 'customer-a', items: [{ recipeId: 'missing', quantity: 1 }], tableNumber: '1', status: 'pending', totalAmount: 1200, inventoryDeducted: false });
  const kitchen = await createStaffClient('kitchen-missing-recipe', 'Kitchen');
  await assert.rejects(() => callable(kitchen.functions, 'transitionOrder')({ orderId: 'order-a', newStatus: 'preparing', restaurantId: RESTAURANT_A }), (error) => error.code === 'functions/failed-precondition');
  await seed(`restaurants/${RESTAURANT_A}/orders/order-b`, { restaurantId: RESTAURANT_A, customerId: 'customer-a', items: [{ menuItemId: 'meal-a', quantity: 1 }], tableNumber: '1', status: 'pending', totalAmount: 1200, inventoryDeducted: false });
  await assert.rejects(() => callable(kitchen.functions, 'transitionOrder')({ orderId: 'order-b', newStatus: 'preparing', restaurantId: RESTAURANT_A }), (error) => error.code === 'functions/failed-precondition');
});

test('Gate 2: concurrent order creation allocates unique daily numbers', async () => {
  const customers = await Promise.all(Array.from({ length: 5 }, (_, index) => createClient(`customer-concurrent-${index}`)));
  const results = await Promise.all(customers.map((customer, index) => callable(customer.functions, 'createOrder')({ restaurantId: RESTAURANT_A, tableNumber: String(index + 1), items: [{ menuItemId: `meal-${index}`, recipeId: 'recipe-a', price: 100, quantity: 1 }], totalAmount: 100 })));
  const numbers = results.map((result) => result.data.orderNumber).sort((a, b) => a - b);
  assert.deepEqual(numbers, [1, 2, 3, 4, 5]);
});
