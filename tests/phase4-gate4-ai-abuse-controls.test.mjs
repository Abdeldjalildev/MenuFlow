import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile('functions/aiProvider.js', 'utf8');

test('Gate 4 defines bounded AI input limits', () => {
  assert.match(source, /MAX_PROMPT_LENGTH\s*=\s*12000/);
  assert.match(source, /MAX_MENU_ITEMS\s*=\s*100/);
  assert.match(source, /MAX_MENU_PAYLOAD_LENGTH\s*=\s*60000/);
});

test('Gate 4 rejects missing or oversized prompts', () => {
  assert.match(source, /prompt\.trim\(\)\.length === 0/);
  assert.match(source, /prompt\.length > MAX_PROMPT_LENGTH/);
});

test('Gate 4 rejects oversized menu payloads', () => {
  assert.match(source, /menuItems\.length > MAX_MENU_ITEMS/);
  assert.match(source, /serializedMenu\.length > MAX_MENU_PAYLOAD_LENGTH/);
});

test('Gate 4 exposes a one-minute per-caller request budget', () => {
  assert.match(source, /RATE_LIMIT_WINDOW_MS\s*=\s*60 \* 1000/);
  assert.match(source, /RATE_LIMIT_MAX_REQUESTS\s*=\s*10/);
  assert.match(source, /AI_RATE_LIMITED/);
  assert.match(source, /runTransaction/);
});

test('Gate 4 provider contains no browser credential access', () => {
  assert.doesNotMatch(source, /import\.meta\.env|VITE_API_KEY|VITE_GEMINI/);
  assert.match(source, /getFirestore\(\)/);
});
