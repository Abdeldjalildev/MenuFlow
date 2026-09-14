import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthoritativeOrder } from '../functions/orderPricing.js';

const menu = new Map([
  ['burger-1', {
    __restaurantId: 'restaurant-a',
    name: 'Burger',
    price: 1200,
    recipeId: 'recipe-1',
  }],
  ['pizza-1', {
    __restaurantId: 'restaurant-a',
    name: 'Pizza',
    price: 1800,
    modifiers: [
      { id: 'cheese', name: 'Extra cheese', price: 300 },
    ],
  }],
]);

test('Gate 9.2: server ignores client-supplied price aliases and derives price from menu authority', () => {
  const result = buildAuthoritativeOrder([
    { menuItemId: 'burger-1', quantity: 2, price: 1, unitPrice: 1, originalPrice: 1 },
  ], menu);
  assert.equal(result.items[0].price, 1200);
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.subtotal, 2400);
  assert.equal(result.discountAmount, 0);
  assert.equal(result.totalAmount, 2400);
});

test('Gate 9.2: server calculates modifier pricing from the menu catalog', () => {
  const result = buildAuthoritativeOrder([
    { menuItemId: 'pizza-1', quantity: 2, price: 0, modifiers: [{ id: 'cheese', price: 99999 }] },
  ], menu);
  assert.equal(result.items[0].price, 1800);
  assert.equal(result.items[0].modifiers[0].price, 300);
  assert.equal(result.totalAmount, 4200);
});

test('Gate 9.2: client cannot inject a fake total or discount into the pricing result', () => {
  const result = buildAuthoritativeOrder([
    { menuItemId: 'burger-1', quantity: 1, price: 0, totalAmount: 0, discountAmount: 99999, appliedDiscountPercent: 100 },
  ], menu);
  assert.equal(result.subtotal, 1200);
  assert.equal(result.discountAmount, 0);
  assert.equal(result.totalAmount, 1200);
});

test('Gate 9.2: unknown menu items are rejected', () => {
  assert.throws(
    () => buildAuthoritativeOrder([{ menuItemId: 'attacker-controlled-id', quantity: 1, price: 0 }], menu),
    error => error?.code === 'not-found',
  );
});

test('Gate 9.2: missing menuItemId is rejected instead of accepting client price-only items', () => {
  assert.throws(
    () => buildAuthoritativeOrder([{ id: 'burger-1', price: 1, quantity: 1 }], menu),
    error => error?.code === 'invalid-argument',
  );
});

test('Gate 9.2: quantities must be positive integers', () => {
  assert.throws(
    () => buildAuthoritativeOrder([{ menuItemId: 'burger-1', quantity: 1.5 }], menu),
    error => error?.code === 'invalid-argument',
  );
});

test('Gate 9.2: unknown modifiers are rejected', () => {
  assert.throws(
    () => buildAuthoritativeOrder([{ menuItemId: 'pizza-1', quantity: 1, modifiers: [{ id: 'fake', price: 0 }] }], menu),
    error => error?.code === 'invalid-argument',
  );
});
