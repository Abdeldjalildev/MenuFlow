import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Gate 13.4: canonical order replay is transactionally idempotent and actor-bound', () => {
  const source = read('functions/canonicalOrderCreation.js');
  assert.match(source, /runTransaction/);
  assert.match(source, /orderMutationReceipts/);
  assert.match(source, /receipt\.actorUid !== actor\.actorUid/);
  assert.match(source, /receipt\.orderSource !== orderSource/);
  assert.match(source, /isReplay:\s*true/);
});

test('Gate 13.4: authoritative order creation is not made dependent on notifications', () => {
  const source = read('functions/canonicalOrderCreation.js');
  assert.match(source, /if \(!result\.isReplay\)/);
  assert.match(source, /createOperationalNotification/);
  assert.match(source, /return \{ ok: true/);
  assert.match(source, /buildAuthoritativeOrder/);
});

test('Gate 13.4: notification writes are deterministic and failure-isolated', () => {
  const source = read('functions/operationalNotifications.js');
  assert.match(source, /eventId/);
  assert.match(source, /transaction/);
  assert.match(source, /catch\s*\(error\)[\s\S]*?return null/);
  assert.match(source, /logDiagnostic/);
});

test('Gate 13.4: order transition alerts cannot become lifecycle authority', () => {
  const source = read('functions/phase9CreateOrder.js');
  assert.match(source, /onDocumentUpdated/);
  assert.match(source, /before\.status === after\.status/);
  assert.match(source, /createOperationalNotification/);
  assert.match(source, /order-transition-\$\{orderId\}-\$\{after\.status\}/);
});

test('Gate 13.4: recovery boundaries are documented without claiming unavailable automation', () => {
  const docs = read('docs/phase13-gate4-resilience-recovery.md');
  assert.match(docs, /backup\/restore configuration must be owned by the deployment\/operator environment/i);
  assert.match(docs, /redeploying a previously verified Git commit/i);
  assert.match(docs, /data migrations must remain reversible/i);
  assert.match(docs, /does not claim an automated backup\/restore system/i);
});
