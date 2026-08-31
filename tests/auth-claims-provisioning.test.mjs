import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');

test('claims provisioning requires authenticated callers', () => {
  assert.match(source, /request\.auth\?\.token/);
  assert.match(source, /unauthenticated/);
});

test('claims provisioning uses Firebase Admin SDK rather than browser auth APIs', () => {
  assert.match(source, /firebase-admin\/auth/);
  assert.match(source, /setCustomUserClaims/);
  assert.doesNotMatch(source, /createUserWithEmailAndPassword/);
});

test('tenant admins cannot provision privileged roles or cross tenant claims', () => {
  assert.match(source, /Only an existing SuperAdmin can provision another SuperAdmin/);
  assert.match(source, /Caller cannot provision this role/);
  assert.match(source, /Cross-tenant claim provisioning is forbidden/);
});

test('tenant roles require a non-empty restaurantId', () => {
  assert.match(source, /Tenant roles require restaurantId/);
  assert.match(source, /isNonEmptyString\(restaurantId\)/);
});

test('claim audit records the authorization decision server-side', () => {
  assert.match(source, /authz_claim_audit/);
  assert.match(source, /actorUid/);
  assert.match(source, /actorRole/);
});
