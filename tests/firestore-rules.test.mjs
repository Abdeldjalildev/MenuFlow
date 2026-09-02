import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-menuflow-rules-test';
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

const unauthenticated = () => testEnv.unauthenticatedContext().firestore();

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

const validReview = (restaurantId, orderId = 'order-a') => ({
  restaurantId,
  orderId,
  rating: 5,
  comment: 'Excellent',
});

const validComplaint = (restaurantId, orderId = 'order-a') => ({
  restaurantId,
  orderId,
  customerName: 'Customer A',
  customerPhone: '5550000',
  message: 'Please check my order.',
  status: 'pending',
});

const validStaff = (restaurantId, uid = 'cashier-a', role = 'Cashier') => ({
  restaurantId,
  uid,
  name: 'Cashier A',
  role,
  phone: '5550000',
  salary: 1000,
  status: 'active',
});

const validMenuItem = (restaurantId, name = 'Meal') => ({
  restaurantId,
  name: { ar: name, en: name, fr: name },
  price: 1200,
  categoryId: 'category-a',
  isAvailable: true,
});

const validCategory = (restaurantId) => ({
  restaurantId,
  name: { ar: 'وجبات', en: 'Meals', fr: 'Repas' },
  isActive: true,
});

const validInventory = (restaurantId) => ({
  restaurantId,
  name: 'Tomatoes',
  unit: 'kg',
  quantity: 10,
});

const validRecipe = (restaurantId) => ({
  restaurantId,
  name: { ar: 'صلصة', en: 'Sauce', fr: 'Sauce' },
  cost: 100,
  recipeIngredients: [{ inventoryItemId: 'inventory-a', quantity: 0.2 }],
});

async function seedTenantData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await Promise.all([
      setDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'theme'), {
        restaurantId: RESTAURANT_A,
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'operational'), {
        restaurantId: RESTAURANT_A,
        restaurantName: 'Restaurant A',
        taxRate: 19,
        deliveryFee: 100,
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'loyalty'), {
        restaurantId: RESTAURANT_A,
        pointsPerCurrencyUnit: 1,
        discountPercent: 10,
        pointsRequiredForDiscount: 100,
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'menuItems', 'menu-a'), validMenuItem(RESTAURANT_A, 'Meal A')),
      setDoc(tenantDoc(db, RESTAURANT_A, 'categories', 'category-a'), validCategory(RESTAURANT_A)),
      setDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a'), validOrder(RESTAURANT_A, CUSTOMER_A)),
      setDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'order-b'), validOrder(RESTAURANT_B, CUSTOMER_B)),
      setDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a'), validStaff(RESTAURANT_A, 'cashier-a', 'Cashier')),
      setDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'kitchen-a'), validStaff(RESTAURANT_A, 'kitchen-a', 'Kitchen')),
      setDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a'), validInventory(RESTAURANT_A)),
      setDoc(tenantDoc(db, RESTAURANT_A, 'recipes', 'recipe-a'), validRecipe(RESTAURANT_A)),
      setDoc(tenantDoc(db, RESTAURANT_A, 'customers', CUSTOMER_A), {
        restaurantId: RESTAURANT_A,
        customerId: CUSTOMER_A,
        points: 0,
        activeDiscount: 0,
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'expenses', 'expense-a'), {
        restaurantId: RESTAURANT_A,
        title: 'Rent',
        amount: 500,
        category: 'operations',
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'suppliers', 'supplier-a'), {
        restaurantId: RESTAURANT_A,
        companyName: 'Supplier A',
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'stockTakes', 'stocktake-a'), {
        restaurantId: RESTAURANT_A,
        inventoryItemId: 'inventory-a',
        previousQuantity: 10,
        countedQuantity: 9,
        difference: -1,
      }),
      setDoc(tenantDoc(db, RESTAURANT_A, 'wasteLogs', 'waste-a'), {
        restaurantId: RESTAURANT_A,
        inventoryItemId: 'inventory-a',
        estimatedLoss: 50,
        reason: 'Spoilage',
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

test('unauthenticated and anonymous customers can read only public storefront data', async () => {
  const publicUnauthenticated = unauthenticated();
  const publicAnonymous = anonymousCustomer();

  await assertSucceeds(getDoc(tenantDoc(publicUnauthenticated, RESTAURANT_A, 'settings', 'theme')));
  await assertSucceeds(getDoc(tenantDoc(publicAnonymous, RESTAURANT_A, 'settings', 'theme')));
  await assertSucceeds(getDoc(tenantDoc(publicAnonymous, RESTAURANT_A, 'menuItems', 'menu-a')));
  await assertSucceeds(getDoc(tenantDoc(publicAnonymous, RESTAURANT_A, 'categories', 'category-a')));
  await assertSucceeds(getDocs(collection(publicAnonymous, 'restaurants', RESTAURANT_A, 'menuItems')));
});

test('customers cannot read private staff, customer, inventory, expense, supplier, or operational data', async () => {
  const db = anonymousCustomer();

  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'customers', CUSTOMER_A)));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'expenses', 'expense-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'suppliers', 'supplier-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'operational')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'settings', 'loyalty')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-b')));
});

test('anonymous customers can create orders only for the tenant encoded by the document path', async () => {
  const db = anonymousCustomer();

  await assertSucceeds(
    setDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'new-order'), validOrder(RESTAURANT_A, CUSTOMER_A)),
  );

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'wrong-tenant-order'),
      validOrder(RESTAURANT_B, CUSTOMER_A),
    ),
  );

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_B, 'orders', 'wrong-tenant-order-reverse'),
      validOrder(RESTAURANT_A, CUSTOMER_A),
    ),
  );
});

test('anonymous customers cannot forge customer identity or privileged order fields', async () => {
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

  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'unknown-field'), {
      ...validOrder(RESTAURANT_A),
      internalAdminNote: 'forged',
    }),
  );
});

test('customers cannot modify or delete orders after creation', async () => {
  const db = anonymousCustomer();

  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a'), { status: 'paid' }),
  );
  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a'), { totalAmount: 1 }),
  );
  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a'), { customerId: CUSTOMER_B }),
  );
});

test('review creation is constrained to the authenticated customer own order', async () => {
  const db = anonymousCustomer();

  await assertSucceeds(
    setDoc(tenantDoc(db, RESTAURANT_A, 'reviews', 'review-a'), validReview(RESTAURANT_A, 'order-a')),
  );

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'reviews', 'review-other-order'),
      validReview(RESTAURANT_A, 'order-b'),
    ),
  );

  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'reviews', 'review-invalid-rating'), {
      ...validReview(RESTAURANT_A),
      rating: 6,
    }),
  );

  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'reviews', 'review-forged-field'), {
      ...validReview(RESTAURANT_A),
      approvedByAdmin: true,
    }),
  );
});

test('complaint creation uses the canonical complaint shape and ownership constraint', async () => {
  const db = anonymousCustomer();

  await assertSucceeds(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'complaints', 'complaint-a'),
      validComplaint(RESTAURANT_A, 'order-a'),
    ),
  );

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'complaints', 'complaint-other-order'),
      validComplaint(RESTAURANT_A, 'order-b'),
    ),
  );

  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'complaints', 'complaint-invalid-status'), {
      ...validComplaint(RESTAURANT_A),
      status: 'resolved',
    }),
  );

  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'complaints', 'complaint-forged-field'), {
      ...validComplaint(RESTAURANT_A),
      internalResolution: 'approved',
    }),
  );
});

test('cashiers stay inside their tenant and can access only their own staff record', async () => {
  const db = tenantUser('cashier-a', RESTAURANT_A, 'Cashier');

  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'customers', CUSTOMER_A)));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'order-b')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'kitchen-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a')));
  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'cashier-cross-tenant'), validOrder(RESTAURANT_B, 'cashier-a')),
  );
  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_B, 'staff', 'cashier-cross-tenant'), validStaff(RESTAURANT_B, 'cashier-cross-tenant')),
  );
});

test('kitchen staff can access tenant inventory and recipes but not financial data', async () => {
  const db = tenantUser('kitchen-a', RESTAURANT_A, 'Kitchen');

  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'recipes', 'recipe-a')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'expenses', 'expense-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'suppliers', 'supplier-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_B, 'inventory', 'inventory-a')));
});

test('delivery staff can access tenant orders but cannot access inventory or mutate public menu data', async () => {
  const db = tenantUser('delivery-a', RESTAURANT_A, 'Delivery');

  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a')));
  await assertFails(getDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a')));
  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'menuItems', 'menu-a'), { price: 1 }),
  );
});

test('admins can manage their tenant but cannot cross tenant boundaries', async () => {
  const db = tenantUser('admin-a', RESTAURANT_A, 'Admin');

  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'expenses', 'expense-a')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'suppliers', 'supplier-a')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'stockTakes', 'stocktake-a')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'wasteLogs', 'waste-a')));
  await assertSucceeds(
    setDoc(tenantDoc(db, RESTAURANT_A, 'menuItems', 'menu-new'), validMenuItem(RESTAURANT_A, 'Meal B')),
  );

  await assertFails(getDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'order-b')));
  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_B, 'staff', 'cross-tenant-staff'), validStaff(RESTAURANT_B, 'cross-tenant-staff')),
  );
  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a'), { restaurantId: RESTAURANT_B }),
  );
});

test('staff cannot escalate their own role or move their own tenant membership', async () => {
  const db = tenantUser('cashier-a', RESTAURANT_A, 'Cashier');
  const selfStaff = tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a');

  await assertFails(updateDoc(selfStaff, { role: 'Admin' }));
  await assertFails(updateDoc(selfStaff, { role: 'SuperAdmin' }));
  await assertFails(updateDoc(selfStaff, { restaurantId: RESTAURANT_B }));
});

test('tenant admins cannot create or promote staff into Admin or SuperAdmin roles', async () => {
  const db = tenantUser('admin-a', RESTAURANT_A, 'Admin');

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'staff', 'new-superadmin'),
      validStaff(RESTAURANT_A, 'new-superadmin', 'SuperAdmin'),
    ),
  );
  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'staff', 'new-admin'),
      validStaff(RESTAURANT_A, 'new-admin', 'Admin'),
    ),
  );

  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a'), { role: 'Admin' }),
  );
});

test('SuperAdmin can perform explicitly permitted cross-tenant administration', async () => {
  const db = superAdmin();

  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_B, 'orders', 'order-b')));
  await assertSucceeds(getDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a')));
  await assertSucceeds(
    setDoc(tenantDoc(db, RESTAURANT_B, 'staff', 'super-managed'), validStaff(RESTAURANT_B, 'super-managed', 'Admin')),
  );
  await assertSucceeds(
    setDoc(tenantDoc(db, RESTAURANT_B, 'menuItems', 'super-menu'), validMenuItem(RESTAURANT_B, 'SuperAdmin menu item')),
  );
});

test('malformed tenant documents are rejected at the rules boundary', async () => {
  const db = tenantUser('admin-a', RESTAURANT_A, 'Admin');

  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'menuItems', 'invalid-menu'), {
      restaurantId: RESTAURANT_A,
      name: 'not-localized-map',
      price: '1200',
      categoryId: 'category-a',
      isAvailable: true,
    }),
  );

  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'categories', 'invalid-category'), {
      restaurantId: RESTAURANT_A,
      name: 'not-a-map',
      isActive: true,
    }),
  );

  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'invalid-inventory'), {
      restaurantId: RESTAURANT_A,
      name: 'Tomatoes',
      unit: 'kg',
      quantity: '10',
    }),
  );

  await assertFails(
    setDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'invalid-staff'), {
      ...validStaff(RESTAURANT_A, 'invalid-staff'),
      role: 'cashier',
    }),
  );
});

test('tenant identity fields remain immutable for staff and core tenant documents', async () => {
  const db = tenantUser('admin-a', RESTAURANT_A, 'Admin');

  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a'), { restaurantId: RESTAURANT_B }),
  );
  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'staff', 'cashier-a'), { uid: 'different-user' }),
  );
  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'menuItems', 'menu-a'), { restaurantId: RESTAURANT_B }),
  );
  await assertFails(
    updateDoc(tenantDoc(db, RESTAURANT_A, 'inventory', 'inventory-a'), { restaurantId: RESTAURANT_B }),
  );
});

test('privileged roles cannot be obtained by changing Firestore data alone', async () => {
  const cashier = tenantUser('cashier-a', RESTAURANT_A, 'Cashier');
  const kitchen = tenantUser('kitchen-a', RESTAURANT_A, 'Kitchen');

  await assertFails(
    updateDoc(tenantDoc(cashier, RESTAURANT_A, 'staff', 'cashier-a'), { role: 'Admin' }),
  );
  await assertFails(
    updateDoc(tenantDoc(kitchen, RESTAURANT_A, 'staff', 'kitchen-a'), { role: 'SuperAdmin' }),
  );
});
