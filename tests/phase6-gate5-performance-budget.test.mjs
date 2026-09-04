import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const budgetSource = await readFile(new URL('../scripts/phase6-performance-budget.mjs', import.meta.url), 'utf8');
const bundleReportSource = await readFile(new URL('../scripts/phase6-bundle-report.mjs', import.meta.url), 'utf8');

test('Phase 6 Gate 5: performance budget is wired into the regression suite', () => {
  assert.equal(packageJson.scripts['test:phase6:gate5'], 'npm run build && npm run perf:bundle-report && node scripts/phase6-performance-budget.mjs');
  assert.match(budgetSource, /MAX_INITIAL_JS_BYTES/);
  assert.match(budgetSource, /MAX_TOTAL_JS_BYTES/);
  assert.match(budgetSource, /process\.exitCode = 1/);
});

test('Phase 6 Gate 5: budget checks use production dist output rather than source estimates', () => {
  assert.match(budgetSource, /join\(process\.cwd\(\), 'dist'\)/);
  assert.match(budgetSource, /readFile\(join\(distDir, 'index\.html'\)/);
  assert.match(budgetSource, /stat\(path\)/);
});

test('Phase 6 Gate 5: asset detection supports Vite root-relative and relative URLs', () => {
  const expectedAssetPattern = `(?:src|href)=["'](?:\\.\\/|\\/)?assets\\/`;
  assert.ok(budgetSource.includes(expectedAssetPattern));
  assert.ok(bundleReportSource.includes(expectedAssetPattern));
  assert.ok(budgetSource.includes('.split(/[?#]/, 1)'));
  assert.ok(bundleReportSource.includes('.split(/[?#]/, 1)'));
});
