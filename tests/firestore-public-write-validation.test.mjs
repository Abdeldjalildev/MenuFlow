import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-menuflow-rules-test';
const RESTAURANT_A = 'restaurant-a';
const CUSTOMER_A = 'customer-a';

let testEnv;

const tenantDoc = (db, restaurantId, collectionName, documentId) =>
  doc(db, 'restaurants', restaurantId, collectionName, documentId);

const anonymousCustomer = () =>
  testEnv.authenticatedContext(CUSTOMER_A, {
    firebase: { sign_in_provider: 'anonymous' },
  }).firestore();

const validOrder = (overrides = {}) => ({
  restaurantId: RESTAURANT_A,
  customerId: CUSTOMER_A,
  items: [],
  tableNumber: '1',
  status: 'pending',
  totalAmount: 1200,
  ...overrides,
});

const validReview = (overrides = {}) => ({
  restaurantId: RESTAURANT_A,
  orderId: 'order-a',
  rating: 5,
  comment: 'Excellent',
  ...overrides,
});

const validComplaint = (overrides = {}) => ({
  restaurantId: RESTAURANT_A,
  orderId: 'order-a',
  customerName: 'Customer A',
  customerPhone: '5550000',
  message: 'Please check my order.',
  status: 'pending',
  ...overrides,
});

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await readFile(new URL('./intended.firestore.rules', import.meta.url), 'utf8'),
    },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(tenantDoc(db, RESTAURANT_A, 'orders', 'order-a'), validOrder());
  });
});

after(async () => {
  await testEnv.cleanup();
});

test('anonymous orders reject negative totals and oversized carts', async () => {
  const db = anonymousCustomer();

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'negative-total'),
      validOrder({ totalAmount: -1 }),
    ),
  );

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'oversized-cart'),
      validOrder({ items: Array.from({ length: 51 }, () => ({ menuItemId: 'item', quantity: 1 })) }),
    ),
  );
});

test('anonymous orders reject invalid core field types and unknown fields', async () => {
  const db = anonymousCustomer();

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'string-total'),
      validOrder({ totalAmount: '1200' }),
    ),
  );

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'non-list-items'),
      validOrder({ items: {} }),
    ),
  );

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'unknown-field'),
      validOrder({ privilegedDiscount: 100 }),
    ),
  );
});

test('anonymous orders reject oversized table and contact fields', async () => {
  const db = anonymousCustomer();
  const oversized = 'x'.repeat(501);

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'oversized-table'),
      validOrder({ tableNumber: 'x'.repeat(33) }),
    ),
  );

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'orders', 'oversized-address'),
      validOrder({ deliveryAddress: oversized }),
    ),
  );
});

test('anonymous reviews reject oversized comments while valid reviews remain allowed', async () => {
  const db = anonymousCustomer();

  await assertSucceeds(
    setDoc(tenantDoc(db, RESTAURANT_A, 'reviews', 'valid-review'), validReview()),
  );

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'reviews', 'oversized-review'),
      validReview({ comment: 'x'.repeat(1001) }),
    ),
  );
});

test('anonymous reviews reject invalid rating types', async () => {
  const db = anonymousCustomer();

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'reviews', 'string-rating'),
      validReview({ rating: '5' }),
    ),
  );
});

test('anonymous complaints reject empty or oversized messages', async () => {
  const db = anonymousCustomer();

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'complaints', 'empty-complaint'),
      validComplaint({ message: '' }),
    ),
  );

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'complaints', 'oversized-complaint'),
      validComplaint({ message: 'x'.repeat(2001) }),
    ),
  );
});

test('anonymous complaints reject invalid rating and message types', async () => {
  const db = anonymousCustomer();

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'complaints', 'string-rating'),
      validComplaint({ rating: '5' }),
    ),
  );

  await assertFails(
    setDoc(
      tenantDoc(db, RESTAURANT_A, 'complaints', 'object-message'),
      validComplaint({ message: { text: 'invalid' } }),
    ),
  );
});
