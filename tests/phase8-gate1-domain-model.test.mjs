import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/types/firestore.ts', import.meta.url), 'utf8');

test('canonical role vocabulary includes Waiter in STAFF_ROLES', () => {
  // STAFF_ROLES is composed from PLATFORM_ROLES + ADMIN_ROLES + OPERATIONAL_ROLES
  assert.match(source, /STAFF_ROLES\s*=\s*\[/);
  assert.match(source, /OPERATIONAL_ROLES\s*=\s*\[\s*'Kitchen',\s*'Cashier',\s*'Delivery',\s*'Waiter',?\s*\]/);
});

test('Waiter is an operational role', () => {
  assert.match(source, /OPERATIONAL_ROLES\s*=\s*\[\s*'Kitchen',\s*'Cashier',\s*'Delivery',\s*'Waiter',?\s*\]/);
});

test('Waiter is tenant-scoped', () => {
  assert.match(source, /TENANT_SCOPED_ROLES/);
  // Verify 'Waiter' appears after TENANT_SCOPED_ROLES definition
  const waiterInTenant = source.indexOf("'Waiter'", source.indexOf('TENANT_SCOPED_ROLES'));
  assert.ok(waiterInTenant > source.indexOf('TENANT_SCOPED_ROLES'), 'Waiter must be in TENANT_SCOPED_ROLES');
});

test('Waiter is provisionable by Admin', () => {
  const waiterInProv = source.indexOf("'Waiter'", source.indexOf('PROVISIONABLE_BY_ADMIN'));
  assert.ok(waiterInProv > source.indexOf('PROVISIONABLE_BY_ADMIN'), 'Waiter must be in PROVISIONABLE_BY_ADMIN');
});

test('platform roles include SuperAdmin', () => {
  assert.match(source, /PLATFORM_ROLES\s*=\s*\[\s*'SuperAdmin'\s*\]/);
});

test('admin roles include Admin', () => {
  assert.match(source, /ADMIN_ROLES\s*=\s*\[\s*'Admin'\s*\]/);
});

test('actor interfaces are defined', () => {
  assert.match(source, /export interface PlatformOwnerActor/);
  assert.match(source, /export interface AdminActor/);
  assert.match(source, /export interface StaffActor/);
  assert.match(source, /export interface CustomerActor/);
  assert.match(source, /export interface FirebaseAuthIdentity/);
  assert.match(source, /export interface RestaurantMembership/);
});

test('identity-role-membership separation is documented', () => {
  assert.match(source, /IDENTITY/);
  assert.match(source, /ROLE/);
  assert.match(source, /MEMBERSHIP/);
  assert.match(source, /PERMISSION/);
  assert.match(source, /RESTAURANT/);
});

test('MenuFlowActor union type is defined', () => {
  assert.match(source, /export type MenuFlowActor\s*=/);
});