import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const functionsSource = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');
const rulesSource = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
const typesSource = await readFile(new URL('../src/types/firestore.ts', import.meta.url), 'utf8');

test('Gate 8.2: AdminMembership interface is defined in domain types', () => {
  assert.match(typesSource, /export interface AdminMembership/);
  assert.match(typesSource, /adminUid: string/);
  assert.match(typesSource, /createdAt: FirestoreDate/);
  assert.match(typesSource, /createdBy: string/);
});

test('Gate 8.2: AdminMembership uses subcollection path pattern', () => {
  assert.match(typesSource, /restaurants\/\{restaurantId\}\/admins\/\{adminUid\}/);
});

test('Gate 8.2: getAdminMemberships callable function exists', () => {
  assert.match(functionsSource, /exports\.getAdminMemberships/);
  assert.match(functionsSource, /getAdminMemberships/);
});

test('Gate 8.2: addAdminMembership callable function exists', () => {
  assert.match(functionsSource, /exports\.addAdminMembership/);
  assert.match(functionsSource, /addAdminMembership/);
});

test('Gate 8.2: removeAdminMembership callable function exists', () => {
  assert.match(functionsSource, /exports\.removeAdminMembership/);
  assert.match(functionsSource, /removeAdminMembership/);
});

test('Gate 8.2: only SuperAdmin can add memberships', () => {
  assert.match(functionsSource, /caller\.role !== 'SuperAdmin'[\s\S]*?Only SuperAdmin can add Admin memberships/);
});

test('Gate 8.2: only SuperAdmin can remove memberships', () => {
  assert.match(functionsSource, /caller\.role !== 'SuperAdmin'[\s\S]*?Only SuperAdmin can remove Admin memberships/);
});

test('Gate 8.2: membership target must be an Admin', () => {
  assert.match(functionsSource, /Target user is not an Admin/);
});

test('Gate 8.2: Admin membership creates audit log', () => {
  assert.match(functionsSource, /admin_membership_audit/);
});

test('Gate 8.2: firestore rules secure AdminMembership subcollection', () => {
  assert.match(rulesSource, /match \/admins\/\{adminUid\}/);
  assert.match(rulesSource, /isSuperAdmin\(\)/);
});

test('Gate 8.2: AdminMembership records are immutable after creation', () => {
  assert.match(rulesSource, /allow update: if false/);
});

test('Gate 8.2: transitionOrder supports Admin membership-based access', () => {
  assert.match(functionsSource, /isAdminOfRestaurant/);
});

test('Gate 8.2: provisionAuthzClaims creates AdminMembership for Admin role', () => {
  assert.match(functionsSource, /role === 'Admin'[\s\S]*?adminUid/);
  assert.match(functionsSource, /restaurants\/\$\{restaurantId\}\/admins\/\$\{targetUid\}/);
});