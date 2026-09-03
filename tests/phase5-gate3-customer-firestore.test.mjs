import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-menuflow-phase5-gate3';
const RESTAURANT_A = 'restaurant-a';
const RESTAURANT_B = 'restaurant-b';
const CUSTOMER_A = 'customer-a';
const CUSTOMER_B = 'customer-b';
let testEnv;

const tenantDoc = (db, restaurantId, collectionName, documentId) =>
  doc(db, 'restaurants', restaurantId, collectionName, documentId);

const anonymousCustomer = (uid = CUSTOMER_A) =>
  testEnv.authenticatedContext(uid, {
    firebase: { sign_in_provider: 'anonymous' },
  }).firestore();

const tenantUser = (uid, restaurantId, role) =>
  testEnv.authenticatedContext(uid, { restaurantId, role }).firestore();

const validOrder = (restaurantId, customerId, overrides = {}) => ({
  restaurantId,
  customerId,
  items: [{ menuItemId: 'meal-a', recipeId: 'recipe-a', price: 1200, quantity: 1 }],
  tableNumber: '1',
  status: 'pending',
  totalAmount: 1200,
  ...overrides,
});

const seed = async (path, data) => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
};

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

test('Gate 3: anonymous customer can read public menu data and only their own order', async () => {
  await seed(`restaurants/${RESTAURANT_A}/menuItems/meal-a`, {
    restaurantId: RESTAURANT_A,
    name: { en: 'Meal A' },
    price: 1200,
  });
  await seed(`restaurants/${RESTAURANT_A}/orders/order-a`, validOrder(RESTAURANT_A, CUSTOMER_A));
  await seed(`restaurants/${RESTAURANT_A}/orders/order-b`, validOrder(RESTAURANT_A, CUSTOMER_B));

  const db = anonymousCustomer();
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'menuItems', 'meal-a')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-b')));
});

test('Gate 3: anonymous customer can create a pending order only for their own Firebase UID', async () => {
  const db = anonymousCustomer();
  await assertSucceeds(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'new-order'),
      validOrder(RESTAURANT_A, CUSTOMER_A),
    ),
  );
  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'forged-customer'),
      validOrder(RESTAURANT_A, CUSTOMER_B),
    ),
  );
});

test('Gate 3: anonymous customer tenant selection is path-scoped, while staff access remains tenant-bound', async () => {
  const db = anonymousCustomer();
  await assertSucceeds(
    setDoc(
      tenantDoc(db, RESTAURANT_B, 'orders', 'cross-tenant-context'),
      validOrder(RESTAURANT_B, CUSTOMER_A),
    ),
  );
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'cross-tenant-context')));

  await seed(`restaurants/${RESTAURANT_B}/orders/staff-order`, validOrder(RESTAURANT_B, CUSTOMER_B));
  const staff = tenantUser('admin-a', RESTAURANT_A, 'Admin');
  await assertFails(getDoc(tenantDoc(staff, RESTAURANT_B, 'orders', 'staff-order')));
});

test('Gate 3: customer order tracking remains readable after staff lifecycle changes', async () => {
  await seed(`restaurants/${RESTAURANT_A}/orders/order-a`, validOrder(RESTAURANT_A, CUSTOMER_A, { status: 'preparing' }));
  const customer = anonymousCustomer();
  const kitchen = tenantUser('kitchen-a', RESTAURANT_A, 'Kitchen');
  await assertSucceeds(updateDoc(tenantDoc(kitchen, RESTAURANT_A, 'orders', 'order-a'), {
    status: 'ready',
    updatedAt: new Date(),
  }));
  const tracked = await getDoc(tenantDoc(customer, RESTAURANT_A, 'orders', 'order-a'));
  assert.equal(tracked.data().status, 'ready');
});

test('Gate 3: review creation requires ownership of the referenced order', async () => {
  await seed(`restaurants/${RESTAURANT_A}/orders/order-a`, validOrder(RESTAURANT_A, CUSTOMER_A, { status: 'completed' }));
  const db = anonymousCustomer();
  await assertSucceeds(
    addDoc(collection(db, 'restaurants', RESTAURANT_A, 'reviews'), {
      restaurantId: RESTAURANT_A,
      orderId: 'order-a',
      rating: 5,
      comment: 'Great',
    }),
  );
  await assertFails(
    addDoc(collection(db, 'restaurants', RESTAURANT_A, 'reviews'), {
      restaurantId: RESTAURANT_A,
      orderId: 'missing-order',
      rating: 5,
      comment: 'Forged',
    }),
  );
  await assertFails(
    addDoc(collection(db, 'restaurants', RESTAURANT_B, 'reviews'), {
      restaurantId: RESTAURANT_B,
      orderId: 'order-a',
      rating: 5,
      comment: 'Cross tenant',
    }),
  );
});

test('Gate 3: complaint creation enforces ownership when orderId is supplied', async () => {
  await seed(`restaurants/${RESTAURANT_A}/orders/order-a`, validOrder(RESTAURANT_A, CUSTOMER_A));
  await seed(`restaurants/${RESTAURANT_A}/orders/order-b`, validOrder(RESTAURANT_A, CUSTOMER_B));
  const db = anonymousCustomer();
  const complaints = collection(db, 'restaurants', RESTAURANT_A, 'complaints');
  await assertSucceeds(addDoc(complaints, {
    restaurantId: RESTAURANT_A,
    orderId: 'order-a',
    customerName: 'Customer A',
    customerPhone: '5550000',
    message: 'Please check my order.',
    status: 'pending',
  }));
  await assertFails(addDoc(complaints, {
    restaurantId: RESTAURANT_A,
    orderId: 'order-b',
    customerName: 'Customer A',
    customerPhone: '5550000',
    message: 'Forged ownership.',
    status: 'pending',
  }));
});

test('Gate 3: malformed and oversized customer writes remain rejected', async () => {
  const db = anonymousCustomer();
  await assertFails(setDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'bad-status'), validOrder(RESTAURANT_A, CUSTOMER_A, { status: 'preparing' })));
  await assertFails(setDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'bad-total'), validOrder(RESTAURANT_A, CUSTOMER_A, { totalAmount: -1 })));
  await assertFails(setDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'too-many-items'), validOrder(RESTAURANT_A, CUSTOMER_A, {
    items: Array.from({ length: 51 }, () => ({ menuItemId: 'meal-a', quantity: 1 })),
  })));
  await assertFails(addDoc(collection(db, 'restaurants', RESTAURANT_A, 'complaints'), {
    restaurantId: RESTAURANT_A,
    message: 'x'.repeat(2001),
    status: 'pending',
  }));
});

test('Gate 3: appendToOrder current direct mutation is rejected by the security contract', async () => {
  await seed(`restaurants/${RESTAURANT_A}/orders/order-a`, validOrder(RESTAURANT_A, CUSTOMER_A));
  const db = tenantUser('admin-a', RESTAURANT_A, 'Admin');
  const order = await getDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a'));
  const data = order.data();
  await assertFails(updateDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a'), {
    items: [...data.items, { menuItemId: 'meal-b', price: 500, quantity: 1, isAppended: true }],
    totalAmount: 1700,
    updatedAt: new Date(),
  }));
});

test('Gate 3: tenant staff cannot read or mutate another tenant order', async () => {
  await seed(`restaurants/${RESTAURANT_B}/orders/order-b`, validOrder(RESTAURANT_B, CUSTOMER_B));
  const db = tenantUser('admin-a', RESTAURANT_A, 'Admin');
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'order-b')));
  await assertFails(updateDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'order-b'), {
    status: 'preparing',
    updatedAt: new Date(),
  }));
});

test('Gate 3: legacy top-level customer paths remain inaccessible', async () => {
  const db = anonymousCustomer();
  await assertFails(getDocs(collection(db, 'orders')));
  await assertFails(getDoc(doc(db, 'orders', 'legacy-order')));
});
