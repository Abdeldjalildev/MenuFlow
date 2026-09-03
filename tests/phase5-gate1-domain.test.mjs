import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { getNextOrderNumber, getOrderNumberDate } from '../functions/orderNumber.js';
import {
  MAX_MENU_ITEMS,
  MAX_MENU_PAYLOAD_LENGTH,
  MAX_PROMPT_LENGTH,
  validateAIInput,
} from '../functions/aiProvider.js';

const require = createRequire(import.meta.url);
const { ORDER_NUMBER_TIME_ZONE } = require('../functions/orderNumber.js');

// Gate 1 intentionally targets deterministic, side-effect-free contracts.
// Firebase transactions, rules, auth claims, and concurrent behavior belong to later gates.

test('Gate 1: order-number helper uses the declared calendar timezone', () => {
  assert.equal(ORDER_NUMBER_TIME_ZONE, 'UTC');
  assert.equal(
    getOrderNumberDate(new Date('2026-08-25T23:59:59.999Z')),
    '2026-08-25',
  );
  assert.equal(
    getOrderNumberDate(new Date('2026-08-26T00:00:00.000Z')),
    '2026-08-26',
  );
});

test('Gate 1: order-number counter accepts the first and valid positive integer values', () => {
  assert.equal(getNextOrderNumber(null), 1);
  assert.equal(getNextOrderNumber(undefined), 1);
  assert.equal(getNextOrderNumber({ nextNumber: 1 }), 1);
  assert.equal(getNextOrderNumber({ nextNumber: 42 }), 42);
  assert.equal(getNextOrderNumber({ nextNumber: '7' }), 7);
});

test('Gate 1: invalid order-number counter states fail closed', () => {
  for (const counterData of [
    { nextNumber: 0 },
    { nextNumber: -1 },
    { nextNumber: 1.5 },
    { nextNumber: Number.NaN },
    { nextNumber: Number.POSITIVE_INFINITY },
    { nextNumber: '' },
    { nextNumber: 'not-a-number' },
    { nextNumber: null },
  ]) {
    assert.throws(
      () => getNextOrderNumber(counterData),
      /order number counter is invalid/i,
    );
  }
});

test('Gate 1: AI prompt validation enforces required, whitespace, and maximum-length boundaries', () => {
  const menu = [];
  assert.equal(typeof validateAIInput('Hello', menu), 'string');
  assert.throws(() => validateAIInput('', menu), /prompt is required/i);
  assert.throws(() => validateAIInput('   \n\t', menu), /prompt is required/i);
  assert.doesNotThrow(() => validateAIInput('x'.repeat(MAX_PROMPT_LENGTH), menu));
  assert.throws(
    () => validateAIInput('x'.repeat(MAX_PROMPT_LENGTH + 1), menu),
    /prompt exceeds/i,
  );
});

test('Gate 1: AI menu validation enforces item-count and serialized-payload boundaries', () => {
  assert.equal(validateAIInput('menu', []), '[]');
  assert.doesNotThrow(() => validateAIInput('menu', Array.from({ length: MAX_MENU_ITEMS }, (_, i) => ({ id: i }))));
  assert.throws(
    () => validateAIInput('menu', Array.from({ length: MAX_MENU_ITEMS + 1 }, () => ({ id: 1 }))),
    /menu payload exceeds/i,
  );

  const largeItem = { description: 'x'.repeat(MAX_MENU_PAYLOAD_LENGTH) };
  assert.throws(
    () => validateAIInput('menu', [largeItem]),
    /menu payload exceeds/i,
  );
});

test('Gate 1: AI menu validation rejects non-array payloads', () => {
  for (const invalidMenu of [null, undefined, {}, 'menu', 42]) {
    assert.throws(
      () => validateAIInput('menu', invalidMenu),
      /menu payload exceeds/i,
    );
  }
});
