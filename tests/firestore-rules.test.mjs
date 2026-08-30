import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'menuflow-rules-test';
const RESTAURANT_A = 'restaurant-a';
const RESTAURANT_B = 'restaurant-b';
const CUSTOMER_A = 'customer-a';

let testEnv;

const restaurantDoc = (db, restaurantId) => doc(db, 'restaurants', restaurantId);
const tenantDoc = (db, restaurantId, collectionName, documentId) =>
  doc(db, 'restaurants', restaurantId, collectionName, documentId);

const anonymousCustomer = (uid = CUSTOMER_A) =>
  testEnv.authenticatedContext(uid, {
    firebase: { sign_in_provider: 'anonymous' },
  }).firestore();

const tenantUser = (uid, restaurantId, role) =>
  testEnv.authenticatedContext(uid, { restaurantId, role }).firestore();

const superAdmin = () =>
  testEnv.authenticatedContext('super-admin', { role: 'SuperAdmin' }).firestore();

const validOrder = (restaurantId, customerId = CUSTOMER_A) => ({
  restaurantId,
  customerId,
  items: [],
  tableNumber: '1',
  status: 'pending',
  totalAmount: 1200,
});

const validFeedback = (restaurantId, orderId = 'order-a') => ({
  restaurantId,
  orderId,
  rating: 5,
  message: 'Excellent',
});

const validStaff = (restaurantId, uid = 'cashier-a') => ({
  restaurantId,
  uid,
  name: 'Cashier A',
  role: 'Cashier',
  phone: '5550000',
  salary: 1000,
  status: 'active',
});

async function seedTenantData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await Promise.all([
      setDoc(restaurantDoc(db, RESTAURANT_A), { name: 'Restaurant A', status: 'active' }),
      setDoc(restaurantDoc(db, RESTAURANT_B), { name: 'Restaurant B', status: 'active' }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'theme'), {
        restaurantId: RESTAURANT_A,
        primaryColor: '#000000',
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'operational'), {
        restaurantId: RESTAURANT_A,
        taxRate: 19,
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'menuItems', 'menu-a'), {
        restaurantId: RESTAURANT_A,
        name: 'Meal A',
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'categories', 'category-a'), {
        restaurantId: RESTAURANT_A,
        name: 'Meals',
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a'), validOrder(RESTAURANT_A)),
      setDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'order-b'), validOrder(RESTAURANT_B, 'customer-b')),
      setDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a'), validStaff(RESTAURANT_A)),
      setDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'kitchen-a'), validStaff(RESTAURANT_A, 'kitchen-a')),
      setDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a'), {
        restaurantId: RESTAURANT_A,
        name: 'Tomatoes',
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'recipes', 'recipe-a'), {
        restaurantId: RESTAURANT_A,
        name: 'Sauce',
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'customers', CUSTOMER_A), {
        restaurantId: RESTAURANT_A,
        customerId: CUSTOMER_A,
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'expenses', 'expense-a'), {
        restaurantId: RESTAURANT_A,
        amount: 500,
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'suppliers', 'supplier-a'), {
        restaurantId: RESTAURANT_A,
        companyName: 'Supplier A',
      }),
    ]);
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await readFile(new URL('./intended.firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedTenantData();
});

after(async () => {
  await testEnv.cleanup();
});

test('public users can read storefront restaurant, theme, menu, and categories', async () => {
  const db = anonymousCustomer();

  await assertSucceeds(getDoc(restaurantDoc(db, RESTAURANT_A)));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'theme')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'menuItems', 'menu-a')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'categories', 'category-a')));
});

test('anonymous customers can create a valid order only when path and tenant fields agree', async () => {
  const db = anonymousCustomer();

  await assertSucceeds(
    setDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'new-order'), validOrder(RESTAURANT_A)),
  );
  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'wrong-tenant-order'),
      validOrder(RESTAURANT_B),
    ),
  );
});

test('anonymous customers cannot forge another customer identity or invalid order shape', async () => {
  const db = anonymousCustomer();

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'forged-customer'),
      validOrder(RESTAURANT_A, 'another-customer'),
    ),
  );
  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'invalid-order'), {
      restaurantId: RESTAURANT_A,
      customerId: CUSTOMER_A,
      status: 'paid',
    }),
  );
});

test('anonymous customers can submit feedback only for an order they own in that tenant', async () => {
  const db = anonymousCustomer();

  await assertSucceeds(
    setDoc(tenantDoc(db, RESTAURANT_A, 'reviews', 'review-a'), validFeedback(RESTAURANT_A)),
  );
  await assertSucceeds(
    setDoc(tenantDoc(db, RESTAURANT_A, 'complaints', 'complaint-a'), validFeedback(RESTAURANT_A)),
  );
  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_B, 'reviews', 'cross-tenant-review'), validFeedback(RESTAURANT_B)),
  );
});

test('anonymous customers cannot submit invalid feedback or read private tenant data', async () => {
  const db = anonymousCustomer();

  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'reviews', 'invalid-review'), {
      ...validFeedback(RESTAURANT_A),
      rating: 6,
    }),
  );

  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'customers', CUSTOMER_A)));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'expenses', 'expense-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'suppliers', 'supplier-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'operational')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'order-b')));
});

test('cashiers can read only their tenant orders and their own staff record', async () => {
  const db = tenantUser('cashier-a', RESTAURANT_A, 'Cashier');

  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'order-b')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'kitchen-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a')));
});

test('kitchen staff can read own-tenant inventory and recipes, but not financial data', async () => {
  const db = tenantUser('kitchen-a', RESTAURANT_A, 'Kitchen');

  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'recipes', 'recipe-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'expenses', 'expense-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_B, 'inventory', 'inventory-a')));
});

test('delivery staff cannot read inventory or mutate menu data', async () => {
  const db = tenantUser('delivery-a', RESTAURANT_A, 'Delivery');

  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a')));
  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'menuItems', 'menu-a'), { name: 'Tampered' }),
  );
});

test('admins can manage their tenant and are denied cross-tenant changes', async () => {
  const db = tenantUser('admin-a', RESTAURANT_A, 'Admin');

  await assertSucceeds(
    setDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-new'), validStaff(RESTAURANT_A, 'cashier-new')),
  );
  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'invalid-staff'), {
      ...validStaff(RESTAURANT_A, 'invalid-staff'),
      role: 'cashier',
    }),
  );
  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_B, 'staff', 'cross-tenant-staff'), validStaff(RESTAURANT_B)),
  );
  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a'), {
      restaurantId: RESTAURANT_B,
    }),
  );
});

test('SuperAdmin can perform explicitly permitted cross-tenant administration', async () => {
  const db = superAdmin();

  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'order-b')));
  await assertSucceeds(
    setDoc(tenantDoc(db, RESTAURANT_B, 'menuItems', 'super-menu'), {
      restaurantId: RESTAURANT_B,
      name: 'SuperAdmin menu item',
    }),
  );
});
