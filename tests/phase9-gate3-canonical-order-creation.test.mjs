import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../functions/canonicalOrderCreation.js', import.meta.url), 'utf8');
const pricing = fs.readFileSync(new URL('../functions/orderPricing.js', import.meta.url), 'utf8');
const wrapper = fs.readFileSync(new URL('../functions/phase9CreateOrder.js', import.meta.url), 'utf8');

test('Gate 9.3: customer and waiter use the same canonical createOrder callable', () => {
  assert.match(source, /const createOrder = onCall/);
  assert.match(source, /orderSource = request\.data\?\.orderSource \|\| 'customer'/);
  assert.match(source, /orderSource === 'customer'/);
  assert.match(source, /orderSource !== 'waiter'/);
  assert.match(source, /role === 'Waiter'/);
  assert.match(source, /role === 'Admin'/);
});

test('Gate 9.3: provenance is server-derived and persisted', () => {
  assert.match(source, /orderSource,\n/);
  assert.match(source, /customerId: actor\.customerId/);
  assert.match(source, /waiterId: actor\.waiterId/);
  assert.match(source, /waiterName: actor\.waiterName/);
  assert.match(source, /orderNumber = getNextOrderNumber/);
});

test('Gate 9.3: pricing remains delegated to the server-authoritative pricing engine', () => {
  assert.match(source, /buildAuthoritativeOrder\(items, menuDataById\)/);
  assert.doesNotMatch(source, /request\.data\?\.totalAmount/);
  assert.doesNotMatch(source, /request\.data\?\.price/);
  assert.match(pricing, /Client-supplied price\/unitPrice\/originalPrice values are deliberately ignored/);
});

test('Gate 9.3: the exported production createOrder is the canonical implementation', () => {
  assert.match(wrapper, /legacyFunctions\.createOrder = createOrder/);
  assert.match(wrapper, /require\('\.\/canonicalOrderCreation'\)/);
});
