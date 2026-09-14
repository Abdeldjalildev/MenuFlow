import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Gate 13.3 preserves the Phase 6 JavaScript budgets', () => {
  const source = read('scripts/phase6-performance-budget.mjs');
  assert.match(source, /850\s*\*\s*1024/);
  assert.match(source, /3\s*\*\s*1024\s*\*\s*1024/);
});

test('Gate 13.3 analytics remains bounded and fail-closed', () => {
  const source = read('functions/phase12Analytics.js');
  assert.match(source, /\.limit\(5000\)/g);
  assert.match(source, /ordersSnap\.size\s*>=\s*5000/);
  assert.match(source, /expensesSnap\.size\s*>=\s*5000/);
  assert.match(source, /resource-exhausted/);
});

test('Gate 13.3 analytics queries remain tenant-scoped', () => {
  const source = read('functions/phase12Analytics.js');
  assert.match(source, /restaurants\/\$\{restaurantId\}\/orders/);
  assert.match(source, /restaurants\/\$\{restaurantId\}\/expenses/);
});

test('Gate 13.3 order creation retains a transactional server authority', () => {
  const source = read('functions/canonicalOrderCreation.js');
  assert.match(source, /runTransaction/);
  assert.match(source, /buildAuthoritativeOrder/);
  assert.match(source, /orderNumber/);
});

test('Gate 13.3 does not introduce speculative scaling dependencies', () => {
  const packageJson = JSON.parse(read('package.json'));
  const dependencyNames = Object.keys(packageJson.dependencies || {});
  assert.equal(dependencyNames.some(name => /redis|memcached|bull|kafka/i.test(name)), false);
});

test('Gate 13.3 keeps later-phase performance work separate from production closure', () => {
  const docs = read('docs/phase13-gate3-performance-scale.md');
  assert.match(docs, /runtime\/load evidence remains required/i);
  assert.match(docs, /materialized-summary/i);
});
