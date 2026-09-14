import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const serviceSource = await readFile(new URL('../src/services/restaurantIdentity.ts', import.meta.url), 'utf8');
const typesSource = await readFile(new URL('../src/types/firestore.ts', import.meta.url), 'utf8');

test('Gate 8.3: RestaurantIdentityService module exists', () => {
  assert.match(serviceSource, /export interface RestaurantIdentity/);
  assert.match(serviceSource, /export interface RestaurantResolutionResult/);
  assert.match(serviceSource, /export type RestaurantStatus/);
});

test('Gate 8.3: RestaurantIdentity has required fields', () => {
  assert.match(serviceSource, /id: RestaurantId/);
  assert.match(serviceSource, /name: string/);
  assert.match(serviceSource, /status: RestaurantStatus/);
  assert.match(serviceSource, /exists: boolean/);
});

test('Gate 8.3: Service resolves restaurant from URL parameter', () => {
  assert.match(serviceSource, /getRestaurantIdFromUrl/);
  assert.match(serviceSource, /URLSearchParams/);
});

test('Gate 8.3: Service resolves restaurant from localStorage', () => {
  assert.match(serviceSource, /getRestaurantIdFromStorage/);
  assert.match(serviceSource, /localStorage\.getItem\('restaurantId'\)/);
});

test('Gate 8.3: Service persists restaurant to localStorage for UX only', () => {
  assert.match(serviceSource, /setRestaurantIdInStorage/);
  assert.match(serviceSource, /localStorage\.setItem\('restaurantId'/);
});

test('Gate 8.3: Service resolves canonical identity from Firestore', () => {
  assert.match(serviceSource, /resolveRestaurantIdentity/);
  assert.match(serviceSource, /getDoc\(doc\(db, 'restaurants', restaurantId\)\)/);
});

test('Gate 8.3: Service resolves from all context sources', () => {
  assert.match(serviceSource, /resolveRestaurantFromContext/);
  assert.match(serviceSource, /source: 'url'/);
  assert.match(serviceSource, /source: 'localStorage'/);
  assert.match(serviceSource, /source: 'default'/);
});

test('Gate 8.3: Service validates restaurant availability for customers', () => {
  assert.match(serviceSource, /isRestaurantAvailableForCustomers/);
  assert.match(serviceSource, /status === 'active'/);
});

test('Gate 8.3: Service documents security boundary', () => {
  assert.match(serviceSource, /UX context ONLY/);
  assert.match(serviceSource, /[Ss]erver-side authorization/);
  assert.match(serviceSource, /authoritative/);
});

test('Gate 8.3: RestaurantId type is canonical string type', () => {
  assert.match(typesSource, /export type RestaurantId = string/);
});

test('Gate 8.3: RestaurantIdentity includes suspended status', () => {
  assert.match(serviceSource, /status === 'suspended'/);
});

test('Gate 8.3: Resolution result includes source for audit', () => {
  assert.match(serviceSource, /source: 'url' \| 'localStorage' \| 'claims' \| 'default' \| 'none'/);
});