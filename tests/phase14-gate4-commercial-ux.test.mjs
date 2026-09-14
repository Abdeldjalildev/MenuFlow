import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Gate 14.4: commercial UI consumes server-derived state', () => {
  const source = read('src/components/merchant/pages/Commercial.tsx');
  assert.match(source, /getCommercialState/);
  assert.match(source, /entitlements/);
  assert.match(source, /subscriptionState/);
});

test('Gate 14.4: plan changes are requests, not client-side entitlement grants', () => {
  const source = read('src/components/merchant/pages/Commercial.tsx');
  assert.match(source, /requestCommercialChange/);
  assert.match(source, /Request \{plan\}/);
  assert.doesNotMatch(source, /setCommercialState/);
});

test('Gate 14.4: request boundary is tenant-checked and server-created', () => {
  const source = read('functions/tenantCommercialState.js');
  assert.match(source, /requestCommercialChange/);
  assert.match(source, /assertTenantAccess/);
  assert.match(source, /changeRequests/);
  assert.match(source, /requestedBy: request\.auth\.uid/);
});

test('Gate 14.4: commercial route is protected to Admin/SuperAdmin', () => {
  const source = read('src/App.tsx');
  assert.match(source, /merchant\/commercial/);
  assert.match(source, /allowedRoles=\{\['Admin', 'SuperAdmin'\]\}/);
});
