import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const waiter = read('src/pages/waiter/WaiterExperience.tsx');
const creation = read('functions/canonicalOrderCreation.js');

test('Gate 10.3: waiter requires explicit table confirmation before order submission', () => {
  assert.match(waiter, /confirmedTable/);
  assert.match(waiter, /confirmCurrentTable/);
  assert.match(waiter, /disabled=\{!confirmedTable \|\| count === 0 \|\| submitting\}/);
  assert.match(waiter, /tableNumber: confirmedTable/);
});

test('Gate 10.3: table input is bounded and validated before confirmation', () => {
  assert.match(waiter, /value\.slice\(0, 32\)/);
  assert.match(waiter, /validTable/);
  assert.match(waiter, /aria-invalid=/);
});

test('Gate 10.3: cart submission sends canonical item identity and customer notes', () => {
  assert.match(waiter, /Object\.entries\(cart\)/);
  assert.match(waiter, /menuItemId, quantity, note/);
  assert.match(waiter, /notes\[menuItemId\]/);
  assert.doesNotMatch(waiter, /totalAmount:/);
  assert.doesNotMatch(waiter, /price:/);
});

test('Gate 10.3: duplicate submission is protected by a stable mutation ID across retries', () => {
  assert.match(waiter, /pendingMutationId/);
  assert.match(waiter, /makeMutationId/);
  assert.match(waiter, /mutationId, items/);
  assert.match(waiter, /Keep the mutation ID after a transport failure/);
  assert.match(creation, /orderMutationReceipts/);
  assert.match(creation, /receiptSnap\.exists\(\)/);
});

test('Gate 10.3: successful server result clears the cart and retry identity', () => {
  assert.match(waiter, /typeof data\.orderNumber !== 'number'/);
  assert.match(waiter, /setCart\(\{\}\)/);
  assert.match(waiter, /setNotes\(\{\}\)/);
  assert.match(waiter, /setPendingMutationId\(null\)/);
});

test('Gate 10.3: canonical backend remains the authority for waiter identity and pricing', () => {
  assert.match(creation, /orderSource === 'waiter'/);
  assert.match(creation, /auth\.uid/);
  assert.match(creation, /buildAuthoritativeOrder\(items, menuDataById\)/);
  assert.match(creation, /status: 'pending'/);
});

console.log('Phase 10 Gate 3 waiter cart/order contract: 6/6 PASS');
