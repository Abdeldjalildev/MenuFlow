import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getNextOrderNumber, getOrderNumberDate } from '../functions/orderNumber.js';

const functionsSource = await readFile(new URL('../functions/index.js', import.meta.url), 'utf8');
const providerSource = await readFile(new URL('../src/context/OrderProvider.tsx', import.meta.url), 'utf8');
const secureMutationsSource = await readFile(new URL('../functions/secureOrderMutations.js', import.meta.url), 'utf8');

test('Gate 4: a new UTC calendar day starts numbering at 1', () => {
  const firstDate = getOrderNumberDate(new Date('2026-08-25T23:59:59.000Z'));
  const nextDate = getOrderNumberDate(new Date('2026-08-26T00:00:00.000Z'));
  assert.notEqual(firstDate, nextDate);
  assert.equal(getNextOrderNumber(null), 1);
  assert.equal(getNextOrderNumber({ nextNumber: 8 }), 8);
});

test('Gate 4: invalid counter state is rejected instead of generating a duplicate/invalid number', () => {
  assert.throws(() => getNextOrderNumber({ nextNumber: 0 }), /counter is invalid/i);
  assert.throws(() => getNextOrderNumber({ nextNumber: 1.5 }), /counter is invalid/i);
  assert.throws(() => getNextOrderNumber({ nextNumber: 'not-a-number' }), /counter is invalid/i);
});

test('Gate 4: order creation is server-authoritative and transaction-backed', () => {
  assert.match(functionsSource, /exports\.createOrder\s*=\s*onCall/);
  assert.match(functionsSource, /orderNumberCounters\/\$\{orderNumberDate\}/);
  assert.match(functionsSource, /await db\.runTransaction\(async tx/);
  assert.match(functionsSource, /const counterSnap = await tx\.get\(counterRef\)/);
  assert.match(functionsSource, /tx\.set\(counterRef, \{ nextNumber: orderNumber \+ 1/);
  assert.match(functionsSource, /tx\.create\(orderRef, \{/);
  assert.match(functionsSource, /orderNumber, orderNumberDate/);
});

test('Gate 4: client no longer derives order numbers and delegates creation to the server', () => {
  assert.doesNotMatch(providerSource, /orders\.filter\(o => toJsDate\(o\.createdAt\) >= today\)\.length \+ 1/);
  assert.match(
    providerSource,
    /httpsCallable(?:<[^>]+>)?\s*\(\s*getFunctions\(\),\s*'createOrder'\s*\)/
  );
});

test('Gate 4: mutable order operations use server-authoritative transactional paths', () => {
  assert.match(providerSource, /httpsCallable\(getFunctions\(\), 'mutateOrder'\)/);
  assert.match(providerSource, /operation: 'item_append'/);
  assert.match(providerSource, /operation: 'driver_claim'/);
  assert.match(secureMutationsSource, /operation === 'item_append'/);
  assert.match(secureMutationsSource, /operation === 'driver_claim'/);
  assert.match(secureMutationsSource, /await db\.runTransaction\(async tx/);
  assert.match(functionsSource, /exports\.transitionOrder\s*=\s*onCall/);
  assert.match(providerSource, /httpsCallable\(getFunctions\(\), 'transitionOrder'\)/);
});
