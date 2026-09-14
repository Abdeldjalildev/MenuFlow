import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Gate 12.5: analytics callable is backend-authorized and bounded', () => {
  const source = read('functions/phase12Analytics.js');
  assert.match(source, /request\.auth/);
  assert.match(source, /token\.role === 'SuperAdmin'/);
  assert.match(source, /token\.role !== 'Admin'/);
  assert.match(source, /restaurants\/\$\{restaurantId\}\/admins\/\$\{request\.auth\.uid\}/);
  assert.match(source, /limit\(5000\)/g);
  assert.match(source, /resource-exhausted/);
});

test('Gate 12.5: browser dashboard consumes callable analytics rather than raw order data', () => {
  const source = read('src/components/merchant/pages/Analytics.tsx');
  assert.match(source, /httpsCallable\(functions, 'getAnalyticsSummary'\)/);
  assert.doesNotMatch(source, /collection\([^)]*orders/);
  assert.doesNotMatch(source, /collection\([^)]*expenses/);
});

test('Gate 12.5: expense records are tenant-scoped and validated by Firestore rules', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /match \/expenses\/\{expenseId\}/);
  assert.match(rules, /validExpense\(restaurantId\)/);
  assert.match(rules, /request\.resource\.data\.restaurantId == restaurantId/);
  assert.match(rules, /request\.resource\.data\.amount is number/);
});

test('Gate 12.5: expense UI writes to the same tenant collection consumed by analytics', () => {
  const source = read('src/components/merchant/pages/Expenses.tsx');
  assert.match(source, /restaurants\/\$\{restaurantId\}\/expenses/);
  assert.match(source, /expenseDate: serverTimestamp\(\)/);
  assert.match(source, /getAuthzClaims/);
  assert.doesNotMatch(source, /collection\(db, 'expenses'/);
});

test('Gate 12.5: analytics contract freezes timezone, currency, range and status semantics', () => {
  const source = read('functions/analyticsContract.js');
  assert.match(source, /MAX_RANGE_DAYS = 366/);
  assert.match(source, /completed/);
  assert.match(source, /cancelled/);
  assert.match(source, /assertTimezone/);
  assert.match(source, /assertCurrency/);
  assert.match(source, /No refund gateway is implemented/);
});

test('Gate 12.5: aggregation uses historical snapshots and restaurant-local date inclusion', () => {
  const source = read('functions/analyticsAggregation.js');
  assert.match(source, /order\.items/);
  assert.match(source, /item\?\.price/);
  assert.match(source, /item\?\.category/);
  assert.match(source, /dateKeyInTimezone/);
  assert.match(source, /day < startDate \|\| day > endDate/);
});
