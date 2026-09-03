import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const functionsIndex = await readFile('functions/index.js', 'utf8');
const aiProvider = await readFile('functions/aiProvider.js', 'utf8');
const frontendService = await readFile('src/services/aiServices.tsx', 'utf8');
const aiComponent = await readFile('src/components/customer/AiChat.tsx', 'utf8');

// Gate 2: the callable is the only server entry point and the Gemini provider
// implementation stays inside the Functions runtime.
test('Gate 2 keeps the AI provider behind the trusted callable', () => {
  assert.match(functionsIndex, /exports\.aiAssistant\s*=\s*onCall\(\{ secrets: \[geminiApiKey\] \}/);
  assert.match(functionsIndex, /require\(['"]\.\/aiProvider['"]\)/);
  assert.match(functionsIndex, /generateGeminiResponse\(apiKey, userPrompt, menuItems, /);
  assert.match(aiProvider, /async function generateGeminiResponse\(apiKey, prompt, menuItems, rateKey\)/);
  assert.match(aiProvider, /AbortController/);
  assert.match(aiProvider, /GEMINI_TIMEOUT_MS\s*=\s*15000/);
  assert.doesNotMatch(aiProvider, /import\.meta\.env|VITE_API_KEY|VITE_GEMINI/);
});

test('Gate 2 preserves the customer callable contract', () => {
  assert.match(frontendService, /httpsCallable<AIRequest, AIResponse>/);
  assert.match(frontendService, /['"]aiAssistant['"]/);
  assert.match(frontendService, /restaurantId: string/);
  assert.match(aiComponent, /getAIResponse\(contextAwarePrompt, menuItems, currentRestaurantId\)/);
});

// Gate 3: the server authenticates the caller and applies tenant authorization
// before reading the privileged provider secret.
test('Gate 3 requires authentication and tenant authorization', () => {
  assert.match(functionsIndex, /function assertAIAuthorization\(request, restaurantId\)/);
  assert.match(functionsIndex, /if \(!auth\) throw new HttpsError\(['"]unauthenticated['"]/);
  assert.match(functionsIndex, /signInProvider === ['"]anonymous['"]/);
  assert.match(functionsIndex, /auth\.token\?\.restaurantId !== restaurantId/);
  assert.match(functionsIndex, /Cross-tenant AI access is forbidden/);
  assert.match(functionsIndex, /role === ['"]SuperAdmin['"]/);
});

test('Gate 3 authorization runs before secret access', () => {
  const handlerStart = functionsIndex.indexOf('exports.aiAssistant =');
  const handler = functionsIndex.slice(handlerStart);
  assert.ok(handler.indexOf('assertAIAuthorization(request, restaurantId)') < handler.indexOf('geminiApiKey.value()'));
});

test('Gate 3 does not move privileged authorization into browser code', () => {
  assert.doesNotMatch(frontendService, /GEMINI_API_KEY|geminiApiKey|defineSecret/);
  assert.doesNotMatch(aiComponent, /GEMINI_API_KEY|geminiApiKey|defineSecret/);
});
