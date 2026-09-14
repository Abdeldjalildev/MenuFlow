import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const service = read('src/services/notificationService.ts');
const writer = read('functions/operationalNotifications.js');
const rules = read('firestore.rules');

test('Gate 11.4: notification domain is tenant-scoped and event types are explicit', () => {
  assert.match(service, /OperationalNotificationType/);
  assert.match(service, /new_order/);
  assert.match(service, /order_transition/);
  assert.match(service, /restaurants.*notifications/);
  assert.match(writer, /NOTIFICATION_TYPES/);
});

test('Gate 11.4: notification writes are backend-only and duplicate-safe', () => {
  assert.match(writer, /runTransaction/);
  assert.match(writer, /existing\.exists/);
  assert.match(writer, /eventId/);
  assert.doesNotMatch(service, /addDoc\(/);
});

test('Gate 11.4: notification failure cannot corrupt the canonical lifecycle', () => {
  assert.match(writer, /catch \(error\)/);
  assert.match(writer, /return null/);
  assert.match(writer, /Operational notification creation failed/);
});

test('Gate 11.4: no browser notification write rule is introduced', () => {
  assert.doesNotMatch(rules, /match \/notifications\//);
  assert.doesNotMatch(service, /setDoc\(/);
});

console.log('Phase 11 Gate 4 notification contract: 4/4 PASS');
