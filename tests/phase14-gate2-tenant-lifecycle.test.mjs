import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Gate 14.2: restaurant creation is a server-authoritative SuperAdmin callable', () => {
  const source = read('functions/tenantOnboarding.js');
  assert.match(source, /onCall/);
  assert.match(source, /caller\.token\?\.role !== 'SuperAdmin'/);
  assert.match(source, /getFirestore\(\)/);
  assert.match(source, /getAuth\(\)/);
  assert.match(source, /runTransaction/);
});

test('Gate 14.2: initial Admin membership is created with the tenant and uses canonical tenant namespace', () => {
  const source = read('functions/tenantOnboarding.js');
  assert.match(source, /restaurantRef\.collection\('admins'\)\.doc\(adminUid\)/);
  assert.match(source, /tx\.create\(restaurantRef/);
  assert.match(source, /tx\.create\(membershipRef/);
  assert.match(source, /adminUid/);
});

test('Gate 14.2: claim publication happens only after membership/tenant provisioning', () => {
  const source = read('functions/tenantOnboarding.js');
  const transactionIndex = source.indexOf('await db.runTransaction');
  const claimIndex = source.indexOf('await auth.setCustomUserClaims');
  const activeIndex = source.indexOf("lifecycleState: 'active'");
  assert.ok(transactionIndex >= 0 && claimIndex > transactionIndex, 'claim must follow tenant transaction');
  assert.ok(activeIndex > claimIndex, 'active lifecycle state must follow successful claim publication');
});

test('Gate 14.2: existing authorization identities cannot be silently overwritten', () => {
  const source = read('functions/tenantOnboarding.js');
  assert.match(source, /AUTH_ROLES = new Set/);
  assert.match(source, /AUTH_ROLES\.has\(existingRole\)/);
  assert.match(source, /already has an authorization role/);
  assert.match(source, /collectionGroup\('admins'\)/);
  assert.match(source, /already has a restaurant membership/);
});

test('Gate 14.2: partial provisioning is recoverable and never falsely reported as active', () => {
  const source = read('functions/tenantOnboarding.js');
  assert.match(source, /lifecycleState: 'provisioning'/);
  assert.match(source, /tx\.delete\(membershipRef\)/);
  assert.match(source, /tx\.delete\(restaurantRef\)/);
  assert.match(source, /Unable to provision the initial Admin authorization/);
});

test('Gate 14.2: client cannot directly create or change restaurant lifecycle state', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /match \/restaurants\/\{restaurantId\} \{/);
  assert.match(rules, /allow create, update, delete: if isSuperAdmin\(\);/);
  assert.doesNotMatch(rules, /allow create, update, delete: if isTenant/);
});

test('Gate 14.2: no speculative billing or plan state is introduced', () => {
  const source = read('functions/tenantOnboarding.js');
  assert.doesNotMatch(source, /subscription|planId|entitlement|stripe|paypal|payment/i);
  assert.match(source, /currency: 'DZD'/);
  assert.match(source, /analytics: \{ currency: 'DZD' \}/);
});

test('Gate 14.2: onboarding audit is tenant-specific and does not alter order authority', () => {
  const source = read('functions/tenantOnboarding.js');
  const orderSource = read('functions/canonicalOrderCreation.js');
  assert.match(source, /restaurant_onboarding_audit/);
  assert.match(source, /restaurantId: restaurantRef\.id/);
  assert.match(orderSource, /buildAuthoritativeOrder/);
  assert.match(orderSource, /runTransaction/);
});
