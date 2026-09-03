import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = {
  index: await readFile('functions/index.js', 'utf8'),
  provider: await readFile('functions/aiProvider.js', 'utf8'),
  frontend: await readFile('src/services/aiServices.tsx', 'utf8'),
  component: await readFile('src/components/customer/AiChat.tsx', 'utf8'),
  runtime: await readFile('functions/package.json', 'utf8'),
};

test('Gate 5: privileged AI credential remains server-side', () => {
  assert.match(files.index, /defineSecret\(['"]GEMINI_API_KEY['"]\)/);
  assert.match(files.index, /secrets: \[geminiApiKey\]/);
  assert.match(files.index, /geminiApiKey\.value\(\)/);
  assert.doesNotMatch(files.frontend, /VITE_API_KEY|VITE_GEMINI|import\.meta\.env|generativelanguage\.googleapis\.com/);
  assert.doesNotMatch(files.component, /VITE_API_KEY|VITE_GEMINI|generativelanguage\.googleapis\.com/);
});

test('Gate 5: callable endpoint is authenticated and tenant-aware', () => {
  assert.match(files.index, /exports\.aiAssistant\s*=\s*onCall/);
  assert.match(files.index, /if \(!auth\) throw new HttpsError\(['"]unauthenticated['"]/);
  assert.match(files.index, /signInProvider === ['"]anonymous['"]/);
  assert.match(files.index, /ALLOWED_ROLES\.has\(role\)/);
  assert.match(files.index, /auth\.token\?\.restaurantId !== restaurantId/);
  assert.match(files.index, /Cross-tenant AI access is forbidden/);
});

test('Gate 5: authorization occurs before secret access', () => {
  const handler = files.index.slice(files.index.indexOf('exports.aiAssistant ='));
  assert.ok(handler.indexOf('assertAIAuthorization(request, restaurantId)') < handler.indexOf('geminiApiKey.value()'));
});

test('Gate 5: input and abuse controls remain enforced server-side', () => {
  assert.match(files.provider, /MAX_PROMPT_LENGTH/);
  assert.match(files.provider, /MAX_MENU_ITEMS/);
  assert.match(files.provider, /MAX_MENU_PAYLOAD_LENGTH/);
  assert.match(files.provider, /runTransaction/);
  assert.match(files.provider, /RATE_LIMIT_MAX_REQUESTS/);
  assert.match(files.provider, /AI_RATE_LIMITED/);
  assert.match(files.index, /resource-exhausted/);
});

test('Gate 5: upstream AI transport is bounded and isolated', () => {
  assert.match(files.provider, /AbortController/);
  assert.match(files.provider, /GEMINI_TIMEOUT_MS\s*=\s*15000/);
  assert.match(files.provider, /generativelanguage\.googleapis\.com/);
  assert.match(files.provider, /encodeURIComponent\(apiKey\)/);
});

test('Gate 5: Functions runtime remains Node 20', () => {
  assert.match(files.runtime, /"node"\s*:\s*"20"/);
});

test('Gate 5: browser integration remains a callable service boundary', () => {
  assert.match(files.frontend, /httpsCallable<AIRequest, AIResponse>/);
  assert.match(files.frontend, /restaurantId: string/);
  assert.match(files.component, /getAIResponse\(contextAwarePrompt, menuItems, currentRestaurantId\)/);
});
