import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contract = require('../functions/analyticsContract.js');

test('Gate 12.1: revenue, expense, profit, status, timezone and currency semantics are explicit', () => {
  const value = contract.normalizeAnalyticsContract({ timezone: 'Africa/Algiers', currency: 'DZD' });
  assert.equal(value.revenueDefinition, 'completed-order totalAmount after authoritative discountAmount');
  assert.equal(value.expenseDefinition.includes('tenant-owned expense records'), true);
  assert.equal(value.netProfitFormula, 'revenue - expenses');
  assert.deepEqual(value.revenueStatuses, ['completed']);
  assert.equal(value.timezone, 'Africa/Algiers');
  assert.equal(value.currency, 'DZD');
});

test('Gate 12.1: invalid or missing timezone fails closed and date ranges are bounded', () => {
  assert.throws(() => contract.normalizeAnalyticsContract({ currency: 'DZD' }), /timezone/i);
  assert.throws(() => contract.normalizeAnalyticsContract({ timezone: 'Not/A/Timezone' }), /timezone/i);
  assert.throws(() => contract.assertDateRange('2026-01-01', '2027-02-01'), /366/);
  assert.deepEqual(contract.assertDateRange('2026-01-01', '2026-01-01'), { startDate: '2026-01-01', endDate: '2026-01-01', days: 1 });
});

test('Gate 12.1: analytics contract rejects malformed currency and dates', () => {
  assert.throws(() => contract.assertCurrency('DZD$'), /currency/i);
  assert.throws(() => contract.assertDateRange('2026-02-30', '2026-03-01'), /date/i);
});
