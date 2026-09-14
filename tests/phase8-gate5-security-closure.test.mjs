import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const typesSource = await readFile(new URL('../src/types/firestore.ts', import.meta.url), 'utf8');
const functionsSource = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');
const rulesSource = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
const authClaimsSource = await readFile(new URL('../src/services/authClaims.ts', import.meta.url), 'utf8');
const superAdminSource = await readFile(new URL('../src/components/Admin/SuperAdminDashboard.tsx', import.meta.url), 'utf8');
const protectedRouteSource = await readFile(new URL('../src/routes/ProtectedRouteProps.tsx', import.meta.url), 'utf8');

test('Gate 8.5: SuperAdmin authorization is claims-based, not email-based', () => {
  assert.match(superAdminSource, /getAuthzClaims/);
  assert.match(superAdminSource, /checkSuperAdminClaims/);
  assert.match(superAdminSource, /claims\?\.role === 'SuperAdmin'/);
  assert.doesNotMatch(superAdminSource, /SUPER_ADMIN_EMAIL/);
  assert.doesNotMatch(superAdminSource, /abdeldjalilkhalfa/);
});

test('Gate 8.5: getAuthzClaims reads from trusted ID token only', () => {
  assert.match(authClaimsSource, /getIdTokenResult/);
  assert.match(authClaimsSource, /tokenResult\.claims/);
  assert.doesNotMatch(authClaimsSource, /localStorage/);
  assert.doesNotMatch(authClaimsSource, /URLSearchParams/);
});

test('Gate 8.5: Admin authorization is membership-based in callable Functions', () => {
  assert.match(functionsSource, /async function isAdminOfRestaurant/);
  assert.match(functionsSource, /role.*!== 'Admin'/);
  assert.match(functionsSource, /admins\/\$\{adminUid\}/);
  assert.match(functionsSource, /membershipSnap\.exists/);
  assert.doesNotMatch(functionsSource, /if \(callerToken\?\.restaurantId === restaurantId\) return true/);
});

test('Gate 8.5: Admin authorization is membership-based in Firestore rules', () => {
  assert.match(rulesSource, /function hasAdminMembership/);
  assert.match(rulesSource, /exists\(\/databases\/\$\(database\)\/documents\/restaurants\/\$\(restaurantId\)\/admins\/\$\(request\.auth\.uid\)\)/);
  assert.match(rulesSource, /role\(\) == 'Admin' && hasAdminMembership\(restaurantId\)/);
});

test('Gate 8.5: Functions enforce cross-tenant isolation for claims provisioning', () => {
  assert.match(functionsSource, /Cross-tenant claim provisioning is forbidden/);
  assert.match(functionsSource, /callerRestaurantId !== restaurantId/);
});

test('Gate 8.5: Functions enforce role-based authorization for transitions', () => {
  assert.match(functionsSource, /A staff authorization role is required/);
  assert.match(functionsSource, /assertTransition/);
});

test('Gate 8.5: Functions enforce tenant mismatch check', () => {
  assert.match(functionsSource, /Tenant mismatch/);
  assert.match(functionsSource, /order\.restaurantId !== effectiveRestaurant/);
});

test('Gate 8.5: Only SuperAdmin can provision SuperAdmin', () => {
  assert.match(functionsSource, /Only an existing SuperAdmin can provision another SuperAdmin/);
});

test('Gate 8.5: AdminMembership functions require SuperAdmin role', () => {
  assert.match(functionsSource, /Only SuperAdmin can add Admin memberships/);
  assert.match(functionsSource, /Only SuperAdmin can remove Admin memberships/);
});

test('Gate 8.5: AdminMembership function verifies target is Admin', () => {
  assert.match(functionsSource, /Target user is not an Admin/);
});

test('Gate 8.5: Admin provisioning establishes membership before publishing Admin claims', () => {
  const membershipIndex = functionsSource.indexOf('adminMembershipCreated = true');
  const claimsIndex = functionsSource.indexOf('setCustomUserClaims(targetUid, claims)');
  assert.ok(membershipIndex >= 0, 'Admin membership creation marker must exist');
  assert.ok(claimsIndex > membershipIndex, 'Admin claims must be published after membership creation');
  assert.match(functionsSource, /Failed to roll back AdminMembership after claim failure/);
});

test('Gate 8.5: AI authorization awaits membership verification', () => {
  assert.match(functionsSource, /await assertAIAuthorization\(request, restaurantId\)/);
  assert.match(functionsSource, /if \(await isAdminOfRestaurant\(auth\.uid, restaurantId, auth\.token\)\) return/);
});

test('Gate 8.5: Firestore rules have SuperAdmin check function', () => {
  assert.match(rulesSource, /function isSuperAdmin/);
  assert.match(rulesSource, /role\(\) == 'SuperAdmin'/);
});

test('Gate 8.5: Firestore rules protect orders collection', () => {
  assert.match(rulesSource, /match \/orders\/{orderId}/);
  assert.match(rulesSource, /isTenantOperator\(restaurantId\)/);
});

test('Gate 8.5: Firestore rules protect staff collection', () => {
  assert.match(rulesSource, /match \/staff\/{staffId}/);
  assert.match(rulesSource, /isTenantAdmin\(restaurantId\)/);
});

test('Gate 8.5: Canonical role tiers are defined', () => {
  assert.match(typesSource, /export const PLATFORM_ROLES/);
  assert.match(typesSource, /export const ADMIN_ROLES/);
  assert.match(typesSource, /export const OPERATIONAL_ROLES/);
  assert.match(typesSource, /export const STAFF_ROLES/);
});

test('Gate 8.5: AdminActor has memberships array', () => {
  assert.match(typesSource, /interface AdminActor/);
  assert.match(typesSource, /memberships: AdminMembership\[\]/);
});

test('Gate 8.5: AdminMembership includes restaurant identity', () => {
  assert.match(typesSource, /interface AdminMembership/);
  assert.match(typesSource, /restaurantId: RestaurantId/);
  assert.match(typesSource, /adminUid: string/);
  assert.match(typesSource, /createdBy: string/);
});

test('Gate 8.5: ProtectedRoute uses claims-based authorization', () => {
  assert.match(protectedRouteSource, /getAuthzClaims/);
  assert.match(protectedRouteSource, /allowedRoles/);
});

test('Gate 8.5: Provisioning creates AdminMembership for Admin role', () => {
  assert.match(functionsSource, /role === 'Admin'/);
  assert.match(functionsSource, /admins\/\$\{targetUid\}/);
});

test('Gate 8.5: Audit logging exists for membership changes', () => {
  assert.match(functionsSource, /admin_membership_audit/);
  assert.match(functionsSource, /authz_claim_audit/);
});
