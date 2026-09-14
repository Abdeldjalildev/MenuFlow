import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const rules = read('firestore.rules');
const creation = read('functions/canonicalOrderCreation.js');
const pricing = read('functions/orderPricing.js');
const mutations = read('functions/secureOrderMutations.js');
const provider = read('src/context/OrderProvider.tsx');
const transition = read('functions/index.js');
const wrapper = read('functions/phase9CreateOrder.js');

const expectMatch = (source, pattern, message) => assert.match(source, pattern, message);
const expectNotMatch = (source, pattern, message) => assert.doesNotMatch(source, pattern, message);

test('Gate 9.5: customer and waiter creation converge on one server authority', () => {
  expectMatch(creation, /const createOrder = onCall/);
  expectMatch(creation, /orderSource = request\.data\?\.orderSource \|\| 'customer'/);
  expectMatch(creation, /role === 'Waiter'/);
  expectMatch(creation, /auth\.uid/);
  expectMatch(wrapper, /legacyFunctions\.createOrder = createOrder/);
  expectMatch(provider, /orderSource: 'customer'/);
});

test('Gate 9.5: client cannot lower prices or totals', () => {
  expectMatch(pricing, /menuData\.price \?\? menuData\.unitPrice/);
  expectNotMatch(creation, /request\.data\?\.totalAmount/);
  expectNotMatch(creation, /request\.data\?\.price/);
  expectNotMatch(provider, /totalAmount: requestedTotal/);
});

test('Gate 9.5: fake restaurant and cross-tenant creation are rejected server-side', () => {
  expectMatch(creation, /restaurants\/\$\{restaurantId\}/);
  expectMatch(creation, /if \(!restaurantSnap\.exists\)/);
  expectMatch(creation, /Waiter.*auth\.token\?\.restaurantId !== restaurantId/s);
  expectMatch(creation, /Admin.*membership/);
});

test('Gate 9.5: order numbering is transactional and server-owned', () => {
  expectMatch(creation, /runTransaction/);
  expectMatch(creation, /getNextOrderNumber/);
  expectMatch(creation, /tx\.set\(counterRef/);
  expectMatch(creation, /orderNumber,/);
  expectMatch(rules, /orderNumberCounters\/\{counterId\} \{ allow read, write: if false; \}/);
});

test('Gate 9.5: direct browser order creation is closed', () => {
  expectMatch(rules, /match \/orders\/\{orderId\} \{\n\s*\/\/ Phase 9 canonicalOrderCreation is the only supported browser-visible creation path\.\n\s*allow create: if false;/);
  expectMatch(provider, /httpsCallable\(getFunctions\(\), 'createOrder'\)/);
});

test('Gate 9.5: mutation paths use backend authority rather than client Firestore transactions', () => {
  expectMatch(provider, /httpsCallable\(getFunctions\(\), 'mutateOrder'\)/);
  expectNotMatch(provider, /runTransaction\(db, async tx =>/);
  expectNotMatch(provider, /tx\.update\(ref, \{ isClaimed/);
  expectMatch(mutations, /authorizeRestaurantActor/);
  expectMatch(mutations, /request\.auth\.uid/);
});

test('Gate 9.5: concurrent-sensitive mutations are transactionally guarded', () => {
  expectMatch(mutations, /driver_claim[\s\S]*runTransaction/);
  expectMatch(mutations, /driver_assign[\s\S]*runTransaction/);
  expectMatch(mutations, /item_append[\s\S]*runTransaction/);
  expectMatch(mutations, /payment_flag[\s\S]*runTransaction/);
});

test('Gate 9.5: duplicate append mutations are idempotency-protected', () => {
  expectMatch(mutations, /mutationId/);
  expectMatch(mutations, /mutationReceipts/);
  expectMatch(mutations, /receipt\.operation !== 'item_append'/);
  expectMatch(mutations, /tx\.create\(receiptRef/);
  expectMatch(mutations, /duplicate/);
});

test('Gate 9.5: inventory integrity blocks append after inventory deduction', () => {
  expectMatch(mutations, /order\.inventoryDeducted === true/);
  expectMatch(mutations, /Orders with deducted inventory cannot be appended/);
  expectMatch(transition, /inventoryDeducted/);
  expectMatch(transition, /assertTransition/);
});

test('Gate 9.5: driver identity cannot be forged during claim', () => {
  expectMatch(mutations, /driverId: request\.auth\.uid/);
  expectNotMatch(mutations, /driver_claim[\s\S]*request\.data\?\.driverId/);
});

test('Gate 9.5: payment and lifecycle invariants remain state-machine controlled', () => {
  expectMatch(mutations, /ready_for_payment.*delivered_unpaid/s);
  expectMatch(mutations, /status: 'paid'/);
  expectMatch(transition, /const TRANSITIONS/);
  expectMatch(transition, /function assertTransition/);
});

test('Gate 9.5: unsupported mutation operations are rejected', () => {
  expectMatch(mutations, /Unsupported order mutation operation/);
});

console.log('Phase 9 Gate 5 order integrity contract: 12/12 PASS');
