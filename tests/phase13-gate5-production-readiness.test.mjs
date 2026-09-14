import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const status = read('docs/current-phase-status.md');
const audit = read('docs/phase13-production-readiness-deep-audit.md');
const closure = read('docs/phase13-gate5-production-readiness-closure.md');
const packageJson = JSON.parse(read('package.json'));

test('Gate 13.5: all five Phase 13 gates are represented in the closure matrix', () => {
  for (const gate of ['13.1', '13.2', '13.3', '13.4', '13.5']) assert.match(closure, new RegExp(`Gate ${gate}`));
});

test('Gate 13.5: verification remains explicitly separate from closure', () => {
  assert.match(status, /Phase 13[\s\S]*VERIFICATION PENDING/);
  assert.match(closure, /not be marked \*\*CLOSED\*\*/i);
  assert.match(audit, /verification and closure remain separate/i);
});

test('Gate 13.5: aggregate Phase 13 command is wired before npm test closure', () => {
  assert.ok(packageJson.scripts['test:phase13:gate1']);
  assert.ok(packageJson.scripts['test:phase13:gate2']);
  assert.ok(packageJson.scripts['test:phase13:gate3']);
  assert.ok(packageJson.scripts['test:phase13:gate4']);
  assert.ok(packageJson.scripts['test:phase13:all']);
  assert.match(packageJson.scripts.test, /test:phase13:gate1/);
  assert.match(packageJson.scripts.test, /test:phase13:gate2/);
  assert.match(packageJson.scripts.test, /test:phase13:gate3/);
});

test('Gate 13.5: production claims remain evidence-bound', () => {
  assert.match(closure, /runtime\/emulator evidence/i);
  assert.match(closure, /backup\/restore/i);
  assert.match(closure, /measured runtime\/load evidence/i);
  assert.match(closure, /no claim of automated backup\/restore/i);
});
