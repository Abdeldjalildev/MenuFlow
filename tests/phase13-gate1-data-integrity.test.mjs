import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const rules = read('firestore.rules');
const schemaDoc = read('docs/firestore-schema.md');
const gateDoc = read('docs/phase13-gate1-data-integrity.md');
const wasteLog = read('src/components/merchant/pages/WasteLog.tsx');
const qrCreations = read('src/components/merchant/pages/QrCreations.tsx');
const expenses = read('src/components/merchant/pages/Expenses.tsx');

test('Gate 13.1: canonical tenant collections are represented in the rules contract', () => {
  for (const collectionName of [
    'settings', 'menuItems', 'categories', 'qrConfig', 'orders', 'notifications',
    'reviews', 'complaints', 'customers', 'staff', 'inventory', 'recipes',
    'expenses', 'admins', 'orderNumberCounters'
  ]) {
    assert.match(rules, new RegExp(`match \\/${collectionName}\\/\\{`), `missing tenant collection rule: ${collectionName}`);
  }
  assert.match(rules, /match \/restaurants\/\{restaurantId\}/);
});

test('Gate 13.1: financial and internal paths are fail-closed to unsupported top-level access', () => {
  assert.match(rules, /match \/orders\/\{orderId\} \{ allow read, write: if false;/);
  assert.match(rules, /match \/customers\/\{customerId\} \{ allow read, write: if false;/);
  assert.match(rules, /match \/expenses\/\{[^}]+\} \{ allow read, write: if false;/);
  assert.match(rules, /match \/authz_claim_audit\/\{entryId\} \{ allow read, write: if false;/);
  assert.match(rules, /match \/admin_membership_audit\/\{entryId\} \{ allow read, write: if false;/);
});

test('Gate 13.1: canonical expense contract is tenant-scoped and schema-bounded', () => {
  assert.match(expenses, /collection\(db, `restaurants\/\$\{restaurantId\}\/expenses`\)/);
  assert.match(rules, /function validExpense\(restaurantId\)/);
  assert.match(rules, /match \/expenses\/\{expenseId\} \{/);
  assert.match(rules, /validExpense\(restaurantId\)/);
  assert.match(gateDoc, /restaurants\/\{restaurantId\}\/expenses\/\{expenseId\}/);
});

test('Gate 13.1: legacy callers are explicitly inventoried instead of silently ignored', () => {
  assert.match(qrCreations, /doc\(db, 'settings', restaurantId\)/);
  assert.match(qrCreations, /doc\(db, 'restaurant_qr_config', restaurantId\)/);
  assert.match(wasteLog, /collection\(db, 'waste_log'\)/);
  assert.match(gateDoc, /settings\/\{id\}/);
  assert.match(gateDoc, /restaurant_qr_config\/\{id\}/);
  assert.match(gateDoc, /waste_log\/\{id\}/);
});

test('Gate 13.1: canonical schema documentation and migration boundary are present', () => {
  assert.match(schemaDoc, /restaurants\/\{restaurantId\}/);
  assert.match(schemaDoc, /Reversible migration strategy/);
  assert.match(schemaDoc, /Never silently delete legacy data/);
  assert.match(gateDoc, /No data migration is executed by Gate 13\.1/);
  assert.match(gateDoc, /No production database rewrite/);
});

test('Gate 13.1: its own scope remains limited to data integrity and migration safety', () => {
  assert.match(gateDoc, /Production Data Integrity & Schema Closure/);
  assert.match(gateDoc, /No data migration is executed by Gate 13\.1/);
  assert.match(gateDoc, /No production database rewrite/);
});
