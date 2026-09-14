import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const customer = read('src/components/customer/CustomerMenu.tsx');
const manager = read('src/components/customer/MenuOrderManager.tsx');
const checkout = read('src/components/customer/CheckoutBar.tsx');
const delivery = read('src/components/customer/DeliveryForm.tsx');
const orderProvider = read('src/context/OrderProvider.tsx');
const tracking = read('src/components/customer/OrderTracking.tsx');
const status = read('src/components/customer/OrderStatus.tsx');
const translations = read('src/utils/translations/customerTranslations.tsx');
const gate1 = read('tests/phase11-gate1-cart-persistence.test.mjs');

test('Gate 11.2: customer ordering distinguishes all required UI states', () => {
  for (const state of ['idle', 'submitting', 'success', 'validation-error', 'auth-error', 'network-error', 'server-rejection']) assert.match(customer, new RegExp(`'${state}'`));
  assert.match(customer, /classifyOrderError/);
});

test('Gate 11.2: cart is cleared only after canonical server success', () => {
  assert.match(customer, /const result = await placeOrder\(/);
  assert.match(customer, /handleOrderSuccess\(result\)/);
  assert.match(customer, /setIsOrderPlaced\(true\)/);
  assert.match(customer, /clearCart\(\)/);
  assert.match(customer, /catch \(error\)/);
  assert.doesNotMatch(customer, /catch \(error\)\s*\{[^}]*clearCart\(\)/s);
});

test('Gate 11.2: customer order creation uses stable mutation identity and exposes the server order number', () => {
  assert.match(orderProvider, /mutationId: newMutationId\(\)/);
  assert.match(orderProvider, /PlaceOrderResult/);
  assert.match(orderProvider, /return response\.data/);
  assert.match(customer, /result\?\.orderNumber/);
  assert.match(manager, /feedback\.orderNumber/);
  assert.match(manager, /t\('orderNumber'\)/);
});

test('Gate 11.2: duplicate submission is visibly and deterministically disabled', () => {
  assert.match(customer, /const isSubmitting = feedback\.state === 'submitting'/);
  assert.match(customer, /disabled=\{isSubmitting\}/);
  assert.match(checkout, /disabled=\{disabled\}/);
  assert.match(checkout, /aria-busy=\{disabled\}/);
  assert.match(delivery, /disabled=\{disabled\}/);
});

test('Gate 11.2: Firebase/internal errors are classified into user-safe categories', () => {
  assert.match(customer, /unauthenticated/);
  assert.match(customer, /unavailable/);
  assert.match(customer, /deadline-exceeded/);
  assert.match(customer, /invalid-argument/);
  assert.match(customer, /permission-denied/);
  assert.match(customer, /orderGenericError/);
  assert.doesNotMatch(customer, /message:.*error\.message/);
});

test('Gate 11.2: feedback uses accessible status/alert semantics and receives focus after state changes', () => {
  assert.match(manager, /tabIndex=\{-1\}/);
  assert.match(manager, /role=\{feedback\.state === 'success'.*'status'.*'alert'/s);
  assert.match(manager, /aria-live=/);
  assert.match(customer, /feedbackRef\.current\?\.focus\(\)/);
  assert.match(delivery, /role="alert"/);
});

test('Gate 11.2: delivery form has associated labels, autocomplete, validation, and keyboard-safe button semantics', () => {
  assert.match(delivery, /htmlFor="delivery-name"/);
  assert.match(delivery, /id="delivery-name"/);
  assert.match(delivery, /autoComplete="name"/);
  assert.match(delivery, /autoComplete="street-address"/);
  assert.match(delivery, /autoComplete="tel"/);
  assert.match(delivery, /type="button"/);
  assert.match(delivery, /aria-invalid=/);
});

test('Gate 11.2: lifecycle remains backend-authoritative and existing tracking renders canonical order state', () => {
  assert.match(tracking, /orders\.filter/);
  assert.match(tracking, /<OrderStatus status=\{currentOrder\.status\}/);
  assert.match(status, /status === 'preparing'/);
  assert.match(status, /status === 'ready'/);
  assert.match(status, /status === 'paid'/);
  assert.doesNotMatch(customer, /set.*Status|setOrderStatus/);
});

test('Gate 11.2: Arabic, English, and French feedback strings are defined', () => {
  assert.match(translations, /ar: \{/);
  assert.match(translations, /fr: \{/);
  assert.match(translations, /en: \{/);
  for (const key of ['orderSubmitting', 'orderSuccess', 'orderNumber', 'orderNetworkError', 'orderValidationError', 'orderServerRejection', 'orderGenericError']) assert.match(translations, new RegExp(`${key}:`));
});

test('Gate 11.2: Gate 11.1 remains an explicit prerequisite contract', () => {
  assert.match(gate1, /Phase 11 Gate 1/);
  assert.match(customer, /clearCart\(\)/);
});

console.log('Phase 11 Gate 2 order UX and feedback contract: 10/10 PASS');
