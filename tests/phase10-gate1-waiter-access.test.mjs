import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const route = read('src/routes/ProtectedRouteProps.tsx');
const login = read('src/pages/auth/Login.tsx');
const waiter = read('src/pages/waiter/WaiterExperience.tsx');
const rules = read('firestore.rules');

test('Gate 10.1: waiter has an explicit protected route', () => {
  assert.match(app, /path="\/waiter"/);
  assert.match(app, /allowedRoles=\{\['Waiter'\]\}/);
  assert.match(route, /authState\.role === 'Waiter'/);
});

test('Gate 10.1: login navigation uses trusted claims for waiter routing', () => {
  assert.match(login, /const claims = await getAuthzClaims\(user\)/);
  assert.match(login, /claims\.role === 'Waiter'\) navigate\('\/waiter'\)/);
});

test('Gate 10.1: waiter tenant identity comes from the trusted claim', () => {
  assert.match(waiter, /getAuthzClaims\(user\)/);
  assert.match(waiter, /claims\.role !== 'Waiter'/);
  assert.match(waiter, /claims\.restaurantId/);
  assert.match(waiter, /setRestaurantId\(claims\.restaurantId\)/);
  assert.doesNotMatch(waiter, /searchParams/);
});

test('Gate 10.1: waiter Firestore scope is tenant-claim based and cannot write orders directly', () => {
  assert.match(rules, /isTenantOperator\(restaurantId\).*Waiter/s);
  assert.match(rules, /allow create: if false;/);
  assert.match(rules, /role\(\) == 'Waiter'.*resource\.data\.uid == request\.auth\.uid/s);
});

console.log('Phase 10 Gate 1 waiter access contract: 4/4 PASS');
