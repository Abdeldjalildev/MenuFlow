const { HttpsError } = require('firebase-functions/v2/https');
const { assertDateRange, ANALYTICS_ORDER_STATUSES } = require('./analyticsContract');

function dateKeyInTimezone(value, timezone) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function hourKeyInTimezone(value, timezone) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hour12: false }).format(date));
}

function amount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

function createEmptyAnalytics(contract, range) {
  return {
    contract: { revenueDefinition: contract.revenueDefinition, expenseDefinition: contract.expenseDefinition, netProfitFormula: contract.netProfitFormula, timezone: contract.timezone, currency: contract.currency },
    range,
    revenue: 0,
    expenses: 0,
    netProfit: 0,
    completedOrders: 0,
    excludedOrders: 0,
    cancelledOrders: 0,
    invalidOrders: 0,
    salesByDay: {},
    salesByHour: {},
    categoryShare: {},
    itemShare: {},
  };
}

function aggregateAnalytics({ orders = [], expenses = [], contract, startDate, endDate }) {
  const range = assertDateRange(startDate, endDate);
  const result = createEmptyAnalytics(contract, range);
  for (const order of orders) {
    if (!order || typeof order !== 'object') { result.invalidOrders += 1; continue; }
    const status = typeof order.status === 'string' ? order.status : '';
    if (ANALYTICS_ORDER_STATUSES.cancelled.has(status)) { result.cancelledOrders += 1; continue; }
    if (!ANALYTICS_ORDER_STATUSES.revenue.has(status)) { result.excludedOrders += 1; continue; }
    const total = amount(order.totalAmount);
    const discount = amount(order.discountAmount ?? 0);
    const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    if (total === null || discount === null || discount > total || Number.isNaN(createdAt.getTime())) { result.invalidOrders += 1; continue; }
    const day = dateKeyInTimezone(createdAt, contract.timezone);
    const hour = hourKeyInTimezone(createdAt, contract.timezone);
    if (!day || day < startDate || day > endDate) continue;
    result.revenue += total;
    result.completedOrders += 1;
    result.salesByDay[day] = (result.salesByDay[day] || 0) + total;
    if (Number.isInteger(hour)) result.salesByHour[String(hour)] = (result.salesByHour[String(hour)] || 0) + total;
    for (const item of Array.isArray(order.items) ? order.items : []) {
      const quantity = Number(item?.quantity ?? item?.qty);
      const price = amount(item?.price);
      const modifierTotal = Array.isArray(item?.modifiers) ? item.modifiers.reduce((sum, modifier) => sum + (amount(modifier?.price) ?? 0), 0) : 0;
      if (!Number.isInteger(quantity) || quantity <= 0 || price === null) continue;
      const lineTotal = (price + modifierTotal) * quantity;
      if (!Number.isFinite(lineTotal) || lineTotal < 0) continue;
      const itemName = typeof item?.name === 'string' && item.name.trim() ? item.name.trim() : String(item?.menuItemId || 'unknown');
      const category = typeof item?.category === 'string' && item.category.trim() ? item.category.trim() : 'Uncategorized';
      result.itemShare[itemName] = (result.itemShare[itemName] || 0) + lineTotal;
      result.categoryShare[category] = (result.categoryShare[category] || 0) + lineTotal;
    }
  }
  for (const expense of expenses) {
    if (!expense || typeof expense !== 'object') continue;
    const value = amount(expense.amount);
    const rawDate = expense.expenseDate ?? expense.date ?? expense.createdAt;
    const date = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
    const day = dateKeyInTimezone(date, contract.timezone);
    if (value === null || !day || day < startDate || day > endDate) continue;
    result.expenses += value;
  }
  result.netProfit = result.revenue - result.expenses;
  return result;
}

function toQueryBounds(startDate, endDate, timezone) {
  assertDateRange(startDate, endDate);
  // Firestore receives a bounded UTC envelope one day wider at each edge. Exact
  // restaurant-local inclusion is applied by aggregateAnalytics after conversion.
  const startUtc = new Date(`${startDate}T00:00:00.000Z`);
  const endUtc = new Date(`${endDate}T23:59:59.999Z`);
  startUtc.setUTCDate(startUtc.getUTCDate() - 1);
  endUtc.setUTCDate(endUtc.getUTCDate() + 1);
  if (Number.isNaN(startUtc.getTime()) || Number.isNaN(endUtc.getTime())) throw new HttpsError('invalid-argument', 'Unable to construct analytics query bounds.');
  return { startUtc, endUtc, timezone };
}

module.exports = { aggregateAnalytics, createEmptyAnalytics, dateKeyInTimezone, hourKeyInTimezone, toQueryBounds };
