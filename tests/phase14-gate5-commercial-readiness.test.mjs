import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Gate 14.5: all prior phase gates are represented in the closure contract', () => {
  const source = read('docs/phase14-gate5-commercial-readiness.md');
  for (const gate of ['14.1', '14.2', '14.3', '14.4']) assert.match(source, new RegExp(gate));
});

test('Gate 14.5: closure requires runtime evidence and does not equate static tests with launch', () => {
  const source = read('docs/phase14-gate5-commercial-readiness.md');
  assert.match(source, /Runtime\/emulator evidence/);
  assert.match(source, /Static tests alone never close the phase/);
  assert.match(source, /does not claim that MenuFlow is commercially launched/);
});

test('Gate 14.5: commercial security boundaries remain explicit', () => {
  const source = read('docs/phase14-gate5-commercial-readiness.md');
  assert.match(source, /No client path can directly grant or mutate commercial entitlements/);
  assert.match(source, /Commercial state remains separate from operational order\/pricing data/);
});

test('Gate 14.5: regression scope preserves core application authorities', () => {
  const source = read('docs/phase14-gate5-commercial-readiness.md');
  assert.match(source, /canonical order creation and mutation authority/);
  assert.match(source, /tenant-scoped authorization/);
  assert.match(source, /analytics security and accuracy contracts/);
  assert.match(source, /existing role boundaries/);
});

test('Gate 14.5: commercial mutation and request paths validate tenant existence', () => {
  const source = read('functions/tenantCommercialState.js');
  assert.match(source, /assertRestaurantExists/);
  assert.match(source, /await assertRestaurantExists\(db, restaurantId\)/);
  assert.match(source, /Only SuperAdmin can change commercial state/);
});

test('Gate 14.5: required verification commands are documented', () => {
  const source = read('docs/phase14-gate5-commercial-readiness.md');
  for (const command of ['test:phase14:gate1', 'test:phase14:gate2', 'test:phase14:gate3', 'test:phase14:gate4', 'test:phase14:gate5', 'npm test']) {
    assert.match(source, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
