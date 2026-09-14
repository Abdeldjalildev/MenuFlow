import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mutation = fs.readFileSync(new URL('../functions/secureOrderMutations.js', import.meta.url), 'utf8');
const backend = fs.readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
const wrapper = fs.readFileSync(new URL('../functions/phase9CreateOrder.js', import.meta.url), 'utf8');

test('Gate 9.4: sensitive mutations are server callables, not client Firestore authority', () => {
  assert.match(mutation, /const mutateOrder = onCall/);
  assert.match(wrapper, /legacyFunctions\.mutateOrder = mutateOrder/);
  assert.match(mutation, /db\.runTransaction/);
});

test('Gate 9.4: every mutation validates tenant identity and actor role', () => {
  assert.match(mutation, /authorizeRestaurantActor/);
  assert.match(mutation, /auth\.token\?\.restaurantId !== restaurantId/);
  assert.match(mutation, /restaurants\/\$\{restaurantId\}\/admins\/\$\{auth\.uid\}/);
  assert.match(mutation, /order\.restaurantId !== restaurantId/);
});

test('Gate 9.4: driver claim and assignment cannot be forged by the client', () => {
  assert.match(mutation, /operation === 'driver_claim'/);
  assert.match(mutation, /driverId: request\.auth\.uid/);
  assert.match(mutation, /operation === 'driver_assign'/);
  assert.match(mutation, /driver\.customClaims\?\.role !== 'Delivery'/);
  assert.match(mutation, /driver\.customClaims\?\.restaurantId !== restaurantId/);
});

test('Gate 9.4: append recalculates the complete order from authoritative menu prices', () => {
  assert.match(mutation, /operation === 'item_append'/);
  assert.match(mutation, /buildAuthoritativeOrder\(combined, menuDataById\)/);
  assert.match(mutation, /subtotal: authoritative\.subtotal/);
  assert.match(mutation, /totalAmount: authoritative\.totalAmount/);
  assert.match(mutation, /\['completed', 'paid'\]/);
});

test('Gate 9.4: payment confirmation is restricted and server-recorded', () => {
  assert.match(mutation, /operation === 'payment_flag'/);
  assert.match(mutation, /request\.data\?\.isPaid !== true/);
  assert.match(mutation, /paymentConfirmedBy: request\.auth\.uid/);
  assert.match(mutation, /paymentConfirmedAt: new Date\(\)/);
});

test('Gate 9.4: existing lifecycle status transitions remain backend-authoritative', () => {
  assert.match(backend, /exports\.transitionOrder = onCall/);
  assert.match(backend, /assertTransition\(role, from, newStatus\)/);
  assert.match(backend, /await isAdminOfRestaurant\(auth\.uid, targetRestaurant, auth\.token\)/);
});
