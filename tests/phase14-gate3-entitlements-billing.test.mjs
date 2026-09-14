import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Gate 14.3: commercial vocabulary and entitlement policy are server-defined', () => {
  const source = read('functions/commercialEntitlements.js');
  assert.match(source, /PLANS/);
  assert.match(source, /SUBSCRIPTION_STATES/);
  assert.match(source, /buildEntitlementSnapshot/);
  assert.match(source, /trialing/);
  assert.match(source, /grace_period/);
});

test('Gate 14.3: client cannot directly change commercial state', () => {
  const source = read('functions/tenantCommercialState.js');
  assert.match(source, /Only SuperAdmin can change commercial state/);
  assert.match(source, /setCommercialState/);
  assert.match(source, /getCommercialState/);
  assert.match(source, /restaurants\/\$\{restaurantId\}\/commercial\/subscription/);
});

test('Gate 14.3: billing provider is intentionally not selected', () => {
  const source = read('functions/commercialEntitlements.js');
  assert.doesNotMatch(source, /stripe|paypal|lemonsqueezy|paddle/i);
});

test('Gate 14.3: paid access is enabled only for trusted lifecycle states', () => {
  const source = read('functions/commercialEntitlements.js');
  assert.match(source, /state === 'trialing' \|\| state === 'active' \|\| state === 'grace_period'/);
  assert.match(source, /enabled && value/);
});

test('Gate 14.3: commercial state remains separate from operational order data', () => {
  const source = read('functions/tenantCommercialState.js');
  assert.doesNotMatch(source, /orders\/\$\{restaurantId\}|canonicalOrderCreation|createOrder/);
});
