import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizeAnalyticsContract } = require('../functions/analyticsContract.js');
const { aggregateAnalytics, toQueryBounds } = require('../functions/analyticsAggregation.js');

const contract = normalizeAnalyticsContract({ timezone: 'Africa/Algiers', currency: 'DZD' });

function ts(iso) { return new Date(iso); }

test('Gate 12.2: aggregation is server-side, tenant-neutral input, bounded, and status-authoritative', () => {
  const result = aggregateAnalytics({
    contract,
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    orders: [
      { status: 'completed', totalAmount: 1000, discountAmount: 0, createdAt: ts('2026-01-01T12:00:00Z'), items: [{ menuItemId: 'burger', name: 'Burger', category: 'Food', price: 1000, quantity: 1 }] },
      { status: 'pending', totalAmount: 9000, createdAt: ts('2026-01-01T13:00:00Z'), items: [] },
      { status: 'cancelled', totalAmount: 8000, createdAt: ts('2026-01-01T14:00:00Z'), items: [] },
    ],
    expenses: [{ amount: 250, expenseDate: ts('2026-01-01T10:00:00Z') }],
  });
  assert.equal(result.revenue, 1000);
  assert.equal(result.expenses, 250);
  assert.equal(result.netProfit, 750);
  assert.equal(result.completedOrders, 1);
  assert.equal(result.excludedOrders, 1);
  assert.equal(result.cancelledOrders, 1);
  assert.equal(result.categoryShare.Food, 1000);
  assert.equal(result.itemShare.Burger, 1000);
});

test('Gate 12.2: historical item snapshots, not current menu prices, drive item/category aggregates', () => {
  const result = aggregateAnalytics({
    contract,
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    orders: [{ status: 'completed', totalAmount: 2400, discountAmount: 0, createdAt: ts('2026-01-01T12:00:00Z'), items: [{ menuItemId: 'pizza', name: 'Pizza', category: 'Food', price: 1100, quantity: 2, modifiers: [{ id: 'cheese', price: 100 }] }] }],
    expenses: [],
  });
  assert.equal(result.itemShare.Pizza, 2400);
  assert.equal(result.categoryShare.Food, 2400);
});

test('Gate 12.2: restaurant-local date filtering is deterministic and browser timezone is irrelevant', () => {
  const result = aggregateAnalytics({
    contract,
    startDate: '2026-01-02',
    endDate: '2026-01-02',
    orders: [{ status: 'completed', totalAmount: 500, discountAmount: 0, createdAt: ts('2026-01-01T23:30:00Z'), items: [] }],
    expenses: [],
  });
  assert.equal(result.revenue, 500);
  assert.equal(result.salesByDay['2026-01-02'], 500);
});

test('Gate 12.2: query architecture is bounded and timezone-safe at both edges', () => {
  const bounds = toQueryBounds('2026-01-01', '2026-01-07', 'Africa/Algiers');
  assert.equal(bounds.startUtc.toISOString(), '2025-12-31T00:00:00.000Z');
  assert.equal(bounds.endUtc.toISOString(), '2026-01-08T23:59:59.999Z');
  assert.throws(() => toQueryBounds('2026-01-08', '2026-01-07', 'Africa/Algiers'), /on or after/i);
});
