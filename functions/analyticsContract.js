const { HttpsError } = require('firebase-functions/v2/https');

const ANALYTICS_ORDER_STATUSES = Object.freeze({
  revenue: new Set(['completed']),
  excluded: new Set(['pending', 'preparing', 'driver_claimed', 'ready', 'ready_for_payment', 'ready_for_delivery', 'on_the_way', 'delivered_unpaid']),
  cancelled: new Set(['cancelled', 'canceled', 'voided']),
});

const DEFAULT_CURRENCY = 'DZD';
const MAX_RANGE_DAYS = 366;

function assertCurrency(value) {
  const currency = typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : DEFAULT_CURRENCY;
  if (!/^[A-Z]{3}$/.test(currency)) throw new HttpsError('failed-precondition', 'Restaurant currency must be a valid ISO-style 3-letter code.');
  return currency;
}

function assertTimezone(value) {
  if (typeof value !== 'string' || !value.trim()) throw new HttpsError('failed-precondition', 'Restaurant analytics timezone is not configured.');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
  } catch {
    throw new HttpsError('failed-precondition', 'Restaurant analytics timezone is invalid.');
  }
  return value;
}

function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpsError('invalid-argument', 'Analytics dates must use YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new HttpsError('invalid-argument', 'Analytics date is invalid.');
  return value;
}

function assertDateRange(startDate, endDate) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const startMs = Date.parse(`${start}T00:00:00.000Z`);
  const endMs = Date.parse(`${end}T00:00:00.000Z`);
  if (endMs < startMs) throw new HttpsError('invalid-argument', 'Analytics endDate must be on or after startDate.');
  const days = Math.floor((endMs - startMs) / 86400000) + 1;
  if (days > MAX_RANGE_DAYS) throw new HttpsError('invalid-argument', `Analytics range cannot exceed ${MAX_RANGE_DAYS} calendar days.`);
  return { startDate: start, endDate: end, days };
}

function normalizeAnalyticsContract(config) {
  return {
    revenueDefinition: 'completed-order totalAmount after authoritative discountAmount',
    expenseDefinition: 'tenant-owned expense records with a valid positive amount and an expense date inside the requested business-day range',
    netProfitFormula: 'revenue - expenses',
    revenueStatuses: [...ANALYTICS_ORDER_STATUSES.revenue],
    excludedStatuses: [...ANALYTICS_ORDER_STATUSES.excluded],
    cancelledStatuses: [...ANALYTICS_ORDER_STATUSES.cancelled],
    refundTreatment: 'No refund gateway is implemented; future refunds must be represented explicitly and must not be inferred from client data.',
    timezone: assertTimezone(config?.timezone),
    currency: assertCurrency(config?.currency),
    snapshotRule: 'Use persisted server-authoritative order totals and item snapshots; never reconstruct historical prices from the current menu.',
    dateSemantics: 'startDate and endDate are restaurant-local calendar dates; start is inclusive and end is inclusive through the following local midnight.',
  };
}

module.exports = {
  ANALYTICS_ORDER_STATUSES,
  DEFAULT_CURRENCY,
  MAX_RANGE_DAYS,
  assertCurrency,
  assertTimezone,
  assertDateRange,
  normalizeAnalyticsContract,
};
