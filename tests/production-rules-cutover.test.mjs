import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';

const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');

test('production rules use tenant-scoped customer paths', () => {
  assert.match(rules, /match \/restaurants\/\{restaurantId\}/);
  assert.match(rules, /match \/orders\/\{orderId\}/);
  assert.match(rules, /match \/reviews\/\{reviewId\}/);
  assert.match(rules, /match \/complaints\/\{complaintId\}/);
  assert.match(rules, /isAnonymousCustomer\(\) && validOrder\(restaurantId\)/);
  assert.match(rules, /isAnonymousCustomer\(\) && validReview\(restaurantId\)/);
  assert.match(rules, /isAnonymousCustomer\(\) && validComplaint\(restaurantId\)/);
});

test('legacy top-level customer write paths are explicitly denied', () => {
  assert.match(rules, /match \/orders\/\{orderId\} \{ allow read, write: if false; \}/);
  assert.match(rules, /match \/reviews\/\{reviewId\} \{ allow read, write: if false; \}/);
  assert.match(rules, /match \/complaints\/\{complaintId\} \{ allow read, write: if false; \}/);
});
