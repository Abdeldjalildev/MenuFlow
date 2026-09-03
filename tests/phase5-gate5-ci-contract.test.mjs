import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const ci = await readFile('.github/workflows/ci.yml', 'utf8');

test('Gate 5: npm test is the complete Phase 5 regression entry point', () => {
  const script = packageJson.scripts.test;
  assert.equal(typeof script, 'string');
  for (const required of [
    'test:phase5:gate1',
    'test:phase5:gate2',
    'test:phase5:gate2:driver',
    'test:phase5:gate3',
    'test:phase5:gate4',
  ]) {
    assert.match(script, new RegExp(required.replaceAll(':', '\\:')));
  }
});

test('Gate 5: CI preserves the repository reliability contract', () => {
  assert.match(ci, /fetch-depth:\s*0/);
  assert.match(ci, /run:\s*npm ci/);
  assert.match(ci, /run:\s*npm run lint/);
  assert.match(ci, /run:\s*npm test/);
  assert.match(ci, /run:\s*npm run build/);
  assert.doesNotMatch(ci, /npm audit fix/);
  assert.doesNotMatch(ci, /continue-on-error:\s*true/);
});

test('Gate 5: Functions validation remains isolated on Node 20', () => {
  assert.match(ci, /node-version:\s*20/);
  assert.match(ci, /working-directory:\s*functions/);
  assert.match(ci, /run:\s*node --check index\.js/);
});
