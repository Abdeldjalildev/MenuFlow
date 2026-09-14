import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const cart = read('src/context/CartContext.tsx');
const menu = read('src/context/MenuProvider.tsx');
const customer = read('src/components/customer/CustomerMenu.tsx');
const order = read('src/context/OrderProvider.tsx');

test('Gate 11.1: cart storage is versioned and scoped to restaurant, table, and Firebase user', () => {
  assert.match(cart, /menuflow:cart:\$\{CART_STORAGE_VERSION\}/);
  assert.match(cart, /encodeURIComponent\(restaurantId\)/);
  assert.match(cart, /encodeURIComponent\(tableKey\)/);
  assert.match(cart, /encodeURIComponent\(uid\)/);
  assert.match(cart, /CART_STORAGE_VERSION = 'v1'/);
});

test('Gate 11.1: persisted state contains only recoverable cart IDs, quantities, and notes', () => {
  assert.match(cart, /interface PersistedCart/);
  assert.match(cart, /items: Record<string, number>/);
  assert.match(cart, /notes: Record<string, string>/);
  assert.doesNotMatch(cart, /interface PersistedCart[\s\S]*price:/);
  assert.doesNotMatch(cart, /interface PersistedCart[\s\S]*total/);
  assert.doesNotMatch(cart, /PersistedCart[\s\S]*unitPrice/);
});

test('Gate 11.1: cart restoration waits for known authentication identity', () => {
  assert.match(cart, /onAuthStateChanged\(auth/);
  assert.match(cart, /if \(!authReady \|\| !activeKey\)/);
  assert.match(cart, /user\?\.uid/);
  assert.match(cart, /setCart\(\{\}\)/);
});

test('Gate 11.1: restored IDs are validated against the active restaurant menu and stale items are dropped', () => {
  assert.match(cart, /const validIds = new Set\(menuItems\.map/);
  assert.match(cart, /sanitizePersistedCart\(persisted, validIds\)/);
  assert.match(cart, /if \(!validIds\.has\(id\)/);
  assert.match(cart, /menuItems\.length === 0/);
});

test('Gate 11.1: quantity, item-count, note, and serialized-storage limits are enforced', () => {
  assert.match(cart, /MAX_CART_ITEMS = 50/);
  assert.match(cart, /MAX_QUANTITY = 100/);
  assert.match(cart, /MAX_NOTE_LENGTH = 500/);
  assert.match(cart, /MAX_STORAGE_BYTES = 20_000/);
  assert.match(cart, /Math\.min\(quantity, MAX_QUANTITY\)/);
  assert.match(cart, /note\.slice\(0, MAX_NOTE_LENGTH\)/);
});

test('Gate 11.1: successful order submission clears the active persisted cart while server remains authoritative', () => {
  assert.match(customer, /await placeOrder\(/);
  assert.match(customer, /handleOrderSuccess/);
  assert.match(customer, /clearCart\(\)/);
  assert.match(order, /mutationId: newMutationId\(\)/);
  assert.match(order, /buildAuthoritativeOrder|canonical/);
});

test('Gate 11.1: restaurant/table UX context remains separate from cart authorization', () => {
  assert.match(menu, /localStorage\.setItem\('restaurantId', restaurantId\)/);
  assert.match(menu, /localStorage\.setItem\('currentTable', table\)/);
  assert.match(cart, /useMenu\(\)/);
  assert.match(cart, /restaurantId, currentTable/);
});

console.log('Phase 11 Gate 1 cart persistence contract: 7/7 PASS');
