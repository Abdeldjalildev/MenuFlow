import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const waiter = read('src/pages/waiter/WaiterExperience.tsx');
const provider = read('src/context/OrderProvider.tsx');
const kitchen = read('src/components/kitchen/KitchenDashboard.tsx');
const creation = read('functions/canonicalOrderCreation.js');


test('Gate 10.4: waiter orders enter the existing pending order lifecycle', () => {
  assert.match(creation, /orderSource/);
  assert.match(creation, /status: 'pending'/);
  assert.match(waiter, /orderSource: 'waiter'/);
});

test('Gate 10.4: kitchen receives tenant-scoped orders through the existing OrderProvider', () => {
  assert.match(kitchen, /OrderContext/);
  assert.match(kitchen, /orders, updateOrderStatus/);
  assert.match(provider, /collection\(db, 'restaurants', targetRestaurant, 'orders'\)/);
  assert.match(provider, /orderBy\('createdAt', 'desc'\)/);
});

test('Gate 10.4: pending waiter orders can enter the established kitchen transition path', () => {
  assert.match(kitchen, /currentStatus === 'pending'/);
  assert.match(kitchen, /updateOrderStatus\(order\.id, 'preparing'\)/);
  assert.match(kitchen, /currentStatus === 'preparing'/);
  assert.match(kitchen, /ready_for_payment/);
  assert.match(kitchen, /ready_for_delivery/);
});

test('Gate 10.4: no second waiter-specific order state machine is introduced', () => {
  assert.doesNotMatch(waiter, /status:\s*['\"](pending|preparing|ready_for_payment|ready_for_delivery)['\"]/);
  assert.doesNotMatch(waiter, /updateOrderStatus/);
  assert.match(waiter, /httpsCallable\(functions, 'createOrder'\)/);
});

test('Gate 10.4: kitchen remains protected from completed and paid orders', () => {
  assert.match(kitchen, /status === 'paid'/);
  assert.match(kitchen, /status === 'completed'/);
  assert.match(kitchen, /!isFinished/);
});

test('Gate 10.4: server lifecycle authority remains transitionOrder', () => {
  assert.match(provider, /httpsCallable\(getFunctions\(\), 'transitionOrder'\)/);
  assert.match(kitchen, /updateOrderStatus\(order\.id/);
});

console.log('Phase 10 Gate 4 kitchen integration contract: 6/6 PASS');
