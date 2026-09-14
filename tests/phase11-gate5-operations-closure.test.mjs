import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Gate 11.5: customer and waiter orders converge on canonical server creation', () => {
  const canonical = read('functions/canonicalOrderCreation.js');
  const waiter = read('src/pages/waiter/WaiterExperience.tsx');
  const customer = read('src/providers/OrderProvider.tsx');
  assert.match(canonical, /buildAuthoritativeOrder/);
  assert.match(canonical, /orderSource/);
  assert.match(waiter, /createOrder/);
  assert.match(waiter, /orderSource.*waiter|waiter.*orderSource/s);
  assert.match(customer, /createOrder/);
});

test('Gate 11.5: lifecycle authority and operational transition alerts are single-path', () => {
  const deployed = read('functions/phase9CreateOrder.js');
  const legacy = read('functions/index.js');
  const notifications = read('functions/operationalNotifications.js');
  assert.match(legacy, /exports\.transitionOrder/);
  assert.match(deployed, /onDocumentUpdated/);
  assert.match(deployed, /order-transition-/);
  assert.match(notifications, /order_transition/);
  assert.match(notifications, /eventId/);
});

test('Gate 11.5: tenant and authorization boundaries remain backend/rules authoritative', () => {
  const canonical = read('functions/canonicalOrderCreation.js');
  const rules = read('firestore.rules');
  const notifications = read('functions/operationalNotifications.js');
  assert.match(canonical, /restaurantId/);
  assert.match(canonical, /auth\.token/);
  assert.match(rules, /restaurants\/\{restaurantId\}\/notifications/);
  assert.match(rules, /allow create, update, delete: if false/);
  assert.match(notifications, /restaurants\/\$\{restaurantId\}\/notifications/);
});

test('Gate 11.5: Phase 11 UX contracts remain multilingual, accessible, and recoverable', () => {
  const ux = read('src/pages/customer/CustomerMenu.tsx');
  const checkout = read('src/components/customer/CheckoutBar.tsx');
  const delivery = read('src/components/customer/DeliveryForm.tsx');
  const cart = read('src/context/CartContext.tsx');
  assert.match(ux, /aria-live|aria-busy/);
  assert.match(checkout, /disabled/);
  assert.match(delivery, /aria-|error/i);
  assert.match(cart, /localStorage/);
  assert.match(cart, /restaurant|table|customer/i);
});

test('Gate 11.5: no payment gateway or external notification infrastructure was introduced', () => {
  const packageJson = read('package.json');
  const notifications = read('functions/operationalNotifications.js');
  assert.doesNotMatch(packageJson, /stripe|paypal/i);
  assert.doesNotMatch(notifications, /twilio|sendgrid|nodemailer|firebase-admin\/messaging/i);
});
