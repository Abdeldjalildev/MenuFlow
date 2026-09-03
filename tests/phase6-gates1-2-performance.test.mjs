import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const packageSource = await readFile(new URL('../package.json', import.meta.url), 'utf8');
const bundleReportSource = await readFile(new URL('../scripts/phase6-bundle-report.mjs', import.meta.url), 'utf8');

test('Phase 6 Gate 1: bundle analysis tooling is present and reads production output', () => {
  assert.match(packageSource, /"perf:bundle-report"\s*:/);
  assert.match(packageSource, /scripts\/phase6-bundle-report\.mjs/);
  assert.match(bundleReportSource, /dist\/index\.html/);
  assert.match(bundleReportSource, /Initial JavaScript/);
  assert.match(bundleReportSource, /Largest JavaScript assets/);
});

test('Phase 6 Gate 2: route components are loaded through React.lazy', () => {
  const expectedLazyImports = [
    './components/customer/CustomerMenu',
    './components/kitchen/kitchenDashboard',
    './components/merchant/MerchantDashboard',
    './pages/TableEntry',
    './pages/StaffScanner',
    './pages/auth/Login',
    './components/cashier/CashierDashboard',
    './components/delivery/DeliveryDashboard',
    './components/Admin/SuperAdminDashboard',
    './components/merchant/pages/Overview',
    './components/merchant/pages/Inventory',
    './components/merchant/pages/Customers',
    './components/merchant/pages/Suppliers',
    './components/merchant/pages/Staff',
    './components/merchant/pages/StaffPerformance',
    './components/merchant/pages/Exepenses',
    './components/merchant/pages/Wastelog',
    './components/merchant/pages/Complaints',
    './components/merchant/pages/Reports',
    './components/merchant/pages/ControlPanel',
    './components/merchant/pages/Recipes',
    './components/merchant/pages/StockTake',
    './components/merchant/pages/ThemeSettings',
    './components/merchant/pages/QrCreations',
  ];

  for (const modulePath of expectedLazyImports) {
    assert.match(appSource, new RegExp(`lazy\\(\\(\\) => import\\(['"]${modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }

  assert.match(appSource, /<Suspense\s+fallback=/);
  assert.doesNotMatch(appSource, /import\s+\{[^}]*CustomerMenu[^}]*\}\s+from\s+['"]\.\/components\/customer\/CustomerMenu/);
  assert.doesNotMatch(appSource, /import\s+\{[^}]*MerchantDashboard[^}]*\}\s+from\s+['"]\.\/components\/merchant\/MerchantDashboard/);
  assert.doesNotMatch(appSource, /import\s+.*Reports.*from\s+['"]\.\/components\/merchant\/pages\/Reports/);
});
