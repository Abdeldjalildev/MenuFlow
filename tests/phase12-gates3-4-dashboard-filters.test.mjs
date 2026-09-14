import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

test('Phase 12 Gate 3: analytics dashboard is server-driven and protected', () => {
  const app = read('src/App.tsx');
  const page = read('src/components/merchant/pages/Analytics.tsx');
  assert.match(app, /\/merchant\/analytics/);
  assert.match(app, /allowedRoles=\{\['Admin', 'SuperAdmin'\]\}/);
  assert.match(page, /httpsCallable\(functions, 'getAnalyticsSummary'\)/);
  assert.match(page, /revenue/);
  assert.match(page, /expenses/);
  assert.match(page, /netProfit/);
  assert.match(page, /salesByDay/);
  assert.match(page, /categoryShare/);
  assert.match(page, /itemShare/);
  assert.match(page, /role="alert"/);
  assert.match(page, /No data|لا توجد بيانات|Aucune donnée/);
});

test('Phase 12 Gate 3: dashboard supports Arabic, French, English and RTL', () => {
  const page = read('src/components/merchant/pages/Analytics.tsx');
  assert.match(page, /ar:/);
  assert.match(page, /fr:/);
  assert.match(page, /en:/);
  assert.match(page, /dir=\{lang === 'ar' \? 'rtl' : 'ltr'\}/);
});

test('Phase 12 Gate 4: date range and granularity filters remain bounded by the server contract', () => {
  const page = read('src/components/merchant/pages/Analytics.tsx');
  const contract = read('functions/analyticsContract.js');
  const callable = read('functions/phase12Analytics.js');
  assert.match(page, /type Granularity = 'day' \| 'month' \| 'hour'/);
  assert.match(page, /startDate/);
  assert.match(page, /endDate/);
  assert.match(page, /categoryShare/);
  assert.match(page, /itemShare/);
  assert.match(page, /previousStart/);
  assert.match(page, /previousEnd/);
  assert.match(contract, /MAX_RANGE_DAYS = 366/);
  assert.match(callable, /limit\(5000\)/);
});

test('Phase 12 Gate 4: peak hour/day are derived from canonical aggregated data', () => {
  const page = read('src/components/merchant/pages/Analytics.tsx');
  assert.match(page, /salesByHour/);
  assert.match(page, /salesByDay/);
  assert.match(page, /peakHour/);
  assert.match(page, /peakDay/);
});
