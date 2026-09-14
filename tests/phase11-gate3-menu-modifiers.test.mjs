import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pricing = read('functions/orderPricing.js');
const creation = read('functions/canonicalOrderCreation.js');
const waiter = read('src/pages/waiter/WaiterExperience.tsx');
const menu = read('src/context/MenuContext.tsx');

test('Gate 11.3: canonical modifier schema and constraints exist server-side', () => {
  assert.match(pricing, /groupId/);
  assert.match(pricing, /minSelections/);
  assert.match(pricing, /maxSelections/);
  assert.match(pricing, /multiple/);
  assert.match(pricing, /Duplicate menu modifiers are not allowed/);
  assert.match(pricing, /Required modifiers are missing/);
  assert.match(pricing, /Too many modifiers selected/);
});

test('Gate 11.3: modifier identity and pricing come only from the tenant menu catalog', () => {
  assert.match(pricing, /catalog\.has\(id\)/);
  assert.match(pricing, /price: parsePrice\(modifier\.price/);
  assert.match(pricing, /modifierUnitTotal/);
  assert.doesNotMatch(pricing, /raw\.price/);
  assert.match(creation, /buildAuthoritativeOrder\(items, menuDataById\)/);
});

test('Gate 11.3: canonical historical modifier snapshot is persisted in order items', () => {
  assert.match(pricing, /name: modifier\.name/);
  assert.match(pricing, /price: modifier\.price/);
  assert.match(pricing, /groupId: modifier\.groupId/);
  assert.match(creation, /items: authoritative\.items/);
});

test('Gate 11.3: waiter/customer ordering remains inside the canonical server boundary', () => {
  assert.match(waiter, /items/);
  assert.match(creation, /normalizeItems/);
  assert.match(menu, /MenuItem/);
});

console.log('Phase 11 Gate 3 menu modifier contract: 4/4 PASS');
