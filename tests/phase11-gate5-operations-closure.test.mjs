import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Gate 11.5: customer and waiter orders converge on canonical server creation', () => {
  const canonical = read('functions/canonicalOrderCreation.js');
  const waiter = read('src/pages/waiter/WaiterExperience.tsx');
  const customerOrder = read('src/context/OrderProvider.tsx');
  assert.match(canonical, /buildAuthoritativeOrder/);
  assert.match(canonical, /orderSource/);
  assert.match(waiter, /httpsCallable\(functions, 'createOrder'\)/);
  assert.match(waiter, /orderSource: 'waiter'/);
  assert.match(customerOrder, /createOrder/);
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

test('Gate 11.5: UX contracts remain multilingual, accessible, and recoverable', () => {
  const waiter = read('src/pages/waiter/WaiterExperience.tsx');
  const cart = read('src/context/CartContext.tsx');
  assert.match(waiter, /ar:|en:|fr:/);
  assert.match(waiter, /dir=\{lang === 'ar' \? 'rtl' : 'ltr'\}/);
  assert.match(waiter, /role="alert"/);
  assert.match(waiter, /role="status"/);
  assert.match(waiter, /disabled=\{!confirmedTable \|\| count === 0 \|\| submitting\}/);
  assert.match(cart, /localStorage/);
  assert.match(cart, /restaurant|table|customer/i);
});

test('Gate 11.5: no payment gateway or external notification infrastructure was introduced', () => {
  const packageJson = read('package.json');
  const notifications = read('functions/operationalNotifications.js');
  assert.doesNotMatch(packageJson, /stripe|paypal/i);
  assert.doesNotMatch(notifications, /twilio|sendgrid|nodemailer|firebase-admin\/messaging/i);
});
