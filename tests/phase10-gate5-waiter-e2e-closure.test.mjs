import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const waiter = read('src/pages/waiter/WaiterExperience.tsx');
const app = read('src/App.tsx');
const route = read('src/routes/ProtectedRouteProps.tsx');
const login = read('src/pages/auth/Login.tsx');
const provider = read('src/context/OrderProvider.tsx');
const kitchen = read('src/components/kitchen/KitchenDashboard.tsx');
const creation = read('functions/canonicalOrderCreation.js');
const rules = read('firestore.rules');
const gate1 = read('tests/phase10-gate1-waiter-access.test.mjs');
const gate2 = read('tests/phase10-gate2-waiter-menu.test.mjs');
const gate3 = read('tests/phase10-gate3-waiter-cart-order.test.mjs');
const gate4 = read('tests/phase10-gate4-kitchen-integration.test.mjs');


test('Gate 10.5: waiter journey is reachable only through the protected waiter route', () => {
  assert.match(app, /path="\/waiter"/);
  assert.match(app, /allowedRoles=\{\['Waiter'\]\}/);
  assert.match(route, /Waiter/);
  assert.match(login, /claims\.role === 'Waiter'/);
  assert.match(login, /navigate\('\/waiter'\)/);
});

test('Gate 10.5: waiter tenant identity comes from trusted claims, not URL/localStorage', () => {
  assert.match(waiter, /getAuthzClaims\(user\)/);
  assert.match(waiter, /claims\.restaurantId/);
  assert.doesNotMatch(waiter, /new URLSearchParams\(window\.location\.search\).*restaurantId/);
  assert.doesNotMatch(waiter, /localStorage\.getItem\(['\"]restaurantId['\"]\)/);
  assert.match(creation, /auth\.token\?\.restaurantId !== restaurantId/);
});

test('Gate 10.5: tenant isolation is enforced at Firestore read and server creation boundaries', () => {
  assert.match(rules, /isTenantOperator\(restaurantId\)/);
  assert.match(rules, /role\(\) != 'Admin' && restaurantClaim\(\) == restaurantId/);
  assert.match(creation, /Waiter is not authorized for this restaurant/);
  assert.match(creation, /Menu item \$\{menuItemId\} does not exist in this restaurant/);
});

test('Gate 10.5: complete waiter ordering path preserves notes, canonical pricing, idempotency, and server identity', () => {
  assert.match(waiter, /orderSource: 'waiter'/);
  assert.match(waiter, /mutationId/);
  assert.match(waiter, /notes\[menuItemId\]/);
  assert.match(creation, /buildAuthoritativeOrder\(items, menuDataById\)/);
  assert.match(creation, /actor\.waiterId/);
  assert.match(creation, /orderSource/);
  assert.match(creation, /receiptSnap\.exists\(\)/);
  assert.match(creation, /receipt\.actorUid !== actor\.actorUid/);
  assert.match(creation, /orderSource === 'waiter' && tableNumber\.trim\(\) === '0'/);
});

test('Gate 10.5: multilingual waiter UI contains Arabic, English, and French paths with RTL support', () => {
  assert.match(waiter, /ar: \{/);
  assert.match(waiter, /en: \{/);
  assert.match(waiter, /fr: \{/);
  assert.match(waiter, /dir=\{lang === 'ar' \? 'rtl' : 'ltr'\}/);
  assert.match(waiter, /value="ar"/);
  assert.match(waiter, /value="en"/);
  assert.match(waiter, /value="fr"/);
});

test('Gate 10.5: waiter order enters the same kitchen lifecycle without a second state machine', () => {
  assert.match(provider, /collection\(db, 'restaurants', targetRestaurant, 'orders'\)/);
  assert.match(kitchen, /currentStatus === 'pending'/);
  assert.match(kitchen, /updateOrderStatus\(order\.id, 'preparing'\)/);
  assert.match(kitchen, /ready_for_payment/);
  assert.match(kitchen, /ready_for_delivery/);
  assert.match(provider, /httpsCallable\(getFunctions\(\), 'transitionOrder'\)/);
  assert.doesNotMatch(waiter, /updateOrderStatus/);
});

test('Gate 10.5: all preceding Phase 10 gate contracts are included in the closure barrier', () => {
  for (const source of [gate1, gate2, gate3, gate4]) assert.match(source, /test\(/);
  assert.match(gate1, /waiter/);
  assert.match(gate2, /menu/);
  assert.match(gate3, /duplicate submission/);
  assert.match(gate4, /kitchen/);
});

test('Gate 10.5: direct browser order creation remains disabled', () => {
  assert.match(rules, /allow create: if false;/);
});

console.log('Phase 10 Gate 5 waiter E2E closure contract: 8/8 PASS');
