import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const staffScannerSource = await readFile(new URL('../src/pages/StaffScanner.tsx', import.meta.url), 'utf8');
const qrScannerSource = await readFile(new URL('../src/components/QrScanner.tsx', import.meta.url), 'utf8');
const menuProviderSource = await readFile(new URL('../src/context/MenuProvider.tsx', import.meta.url), 'utf8');
const analyticsSource = await readFile(new URL('../src/components/merchant/pages/AnalyticsDashboard.tsx', import.meta.url), 'utf8');

test('Phase 6 Gate 3: QR scanner dependency is isolated behind feature-level lazy loading', () => {
  assert.match(staffScannerSource, /lazy\(\(\) => import\(['"]\.\.\/components\/QrScanner/);
  assert.match(staffScannerSource, /<Suspense\s+fallback=/);
  assert.doesNotMatch(staffScannerSource, /import\s+\{[^}]*QrScanner[^}]*\}\s+from\s+['"]\.\.\/components\/QrScanner/);
  assert.match(qrScannerSource, /from ['"]html5-qrcode['"]/);
});

test('Phase 6 Gate 4: high-fanout menu context value and setter are stable', () => {
  assert.match(menuProviderSource, /useCallback/);
  assert.match(menuProviderSource, /const setTable = useCallback\(/);
  assert.match(menuProviderSource, /const value = useMemo\(/);
  assert.match(menuProviderSource, /<MenuContext\.Provider value=\{value\}>/);
});

test('Phase 6 Gate 4: analytics derivation is memoized by its real inputs', () => {
  assert.match(analyticsSource, /useContext, useMemo/);
  assert.match(analyticsSource, /const chartData = useMemo\(\(\) =>/);
  assert.match(analyticsSource, /\[orders, lang, t\.unknownItem\]\)/);
});
