import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Gate 14.1: Firebase production boundary is explicit and reproducible', () => {
  const firebase = read('firebase.json');
  assert.match(firebase, /"functions"\s*:\s*\{\s*"source"\s*:\s*"functions"/);
  assert.match(firebase, /"firestore"\s*:\s*\{\s*"rules"\s*:\s*"firestore\.rules"/);
  assert.match(firebase, /"singleProjectMode"\s*:\s*true/);
  assert.match(firebase, /"port"\s*:\s*9099/);
  assert.match(firebase, /"port"\s*:\s*8080/);
  assert.match(firebase, /"port"\s*:\s*5001/);
});

test('Gate 14.1: production build and deployment prerequisites are documented without secrets', () => {
  const docs = read('docs/phase14-gate1-production-environment.md');
  const packageJson = read('package.json');
  assert.match(packageJson, /"build"\s*:\s*"tsc -b && vite build"/);
  assert.match(docs, /Functions Node 20/i);
  assert.match(docs, /us-central1/);
  assert.match(docs, /secrets must not be committed/i);
  assert.match(docs, /rollback/i);
  assert.match(docs, /smoke/i);
});

test('Gate 14.1: no production deployment is claimed or triggered by the gate', () => {
  const docs = read('docs/phase14-gate1-production-environment.md');
  assert.match(docs, /No production deployment is executed by Gate 14\.1/i);
  assert.match(docs, /operator authorization/i);
});

test('Gate 14.1: critical runtime configuration stays server-side where applicable', () => {
  const phase9 = read('functions/phase9CreateOrder.js');
  const onboarding = read('functions/tenantOnboarding.js');
  assert.match(phase9, /region:\s*'us-central1'/);
  assert.match(onboarding, /getAuth\(\)/);
  assert.match(onboarding, /getFirestore\(\)/);
});
