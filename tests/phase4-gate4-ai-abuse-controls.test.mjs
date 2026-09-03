import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateAIInput,
  MAX_PROMPT_LENGTH,
  MAX_MENU_ITEMS,
  MAX_MENU_PAYLOAD_LENGTH,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
} from '../functions/aiProvider.js';

test('Gate 4 defines bounded AI input limits', () => {
  assert.equal(MAX_PROMPT_LENGTH, 4000);
  assert.equal(MAX_MENU_ITEMS, 100);
  assert.equal(MAX_MENU_PAYLOAD_LENGTH, 60000);
});

test('Gate 4 rejects missing or oversized prompts', () => {
  assert.throws(() => validateAIInput('', []), /prompt is required/i);
  assert.throws(() => validateAIInput('x'.repeat(MAX_PROMPT_LENGTH + 1), []), /prompt exceeds/i);
});

test('Gate 4 rejects oversized menu payloads', () => {
  assert.throws(() => validateAIInput('hello', Array.from({ length: MAX_MENU_ITEMS + 1 }, () => ({ name: 'x' }))), /item count/i);
  assert.throws(() => validateAIInput('hello', [{ data: 'x'.repeat(MAX_MENU_PAYLOAD_LENGTH) }]), /payload exceeds/i);
});

test('Gate 4 exposes a one-minute per-caller request budget', () => {
  assert.equal(RATE_LIMIT_WINDOW_MS, 60000);
  assert.equal(RATE_LIMIT_MAX_REQUESTS, 10);
});

// The provider must remain server-side and must never read browser credentials.
test('Gate 4 provider contains no browser credential access', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('functions/aiProvider.js', 'utf8');
  assert.doesNotMatch(source, /import\.meta\.env|VITE_API_KEY|VITE_GEMINI/);
  assert.match(source, /getFirestore\(\)/);
  assert.match(source, /runTransaction/);
  assert.match(source, /AI_RATE_LIMITED/);
});
