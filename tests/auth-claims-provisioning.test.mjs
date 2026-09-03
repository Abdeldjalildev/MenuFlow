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

test('tenant admins can provision only non-privileged staff roles', () => {
  assert.match(source, /TENANT_STAFF_ROLES = new Set\(\['Cashier', 'Kitchen', 'Delivery'\]\)/);
  assert.match(source, /callerRole !== 'Admin' || !TENANT_STAFF_ROLES\.has\(role\)/);
  assert.doesNotMatch(source, /TENANT_STAFF_ROLES = new Set\(\['Admin'/);
});

test('only SuperAdmin can provision or modify SuperAdmin claims', () => {
  assert.match(source, /Only an existing SuperAdmin can provision another SuperAdmin/);
  assert.match(source, /Tenant administrators cannot modify SuperAdmin claims/);
});

test('tenant claim provisioning cannot cross tenant boundaries', () => {
  assert.match(source, /Cross-tenant claim provisioning is forbidden/);
});

test('tenant roles require a non-empty restaurantId', () => {
  assert.match(source, /Tenant roles require restaurantId/);
  assert.match(source, /isNonEmptyString\(restaurantId\)/);
});

test('target Firebase accounts must exist before claims are changed', () => {
  assert.match(source, /getAuth\(\)\.getUser\(targetUid\)/);
  assert.match(source, /Target Firebase user does not exist/);
});

test('claim audit records the authorization decision server-side', () => {
  assert.match(source, /authz_claim_audit/);
  assert.match(source, /actorUid/);
  assert.match(source, /actorRole/);
});
