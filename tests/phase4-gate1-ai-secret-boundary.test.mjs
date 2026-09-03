import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const frontendService = await readFile('src/services/aiServices.tsx', 'utf8');
const aiComponent = await readFile('src/components/customer/AiChat.tsx', 'utf8');
const functionsIndex = await readFile('functions/index.js', 'utf8');
const functionsPackage = await readFile('functions/package.json', 'utf8');

 test('frontend AI service delegates to the trusted callable', () => {
  assert.match(frontendService, /httpsCallable/);
  assert.match(frontendService, /['"]aiAssistant['"]/);
  assert.doesNotMatch(frontendService, /VITE_API_KEY|VITE_GEMINI|import\.meta\.env/);
  assert.doesNotMatch(frontendService, /generativelanguage\.googleapis\.com/);
});

test('customer AI UI keeps its existing service contract', () => {
  assert.match(aiComponent, /getAIResponse\(contextAwarePrompt, menuItems\)/);
  assert.doesNotMatch(aiComponent, /VITE_API_KEY|VITE_GEMINI|generativelanguage\.googleapis\.com/);
});

test('Gemini credential is declared as a server-side secret', () => {
  assert.match(functionsIndex, /defineSecret\(['"]GEMINI_API_KEY['"]\)/);
  assert.match(functionsIndex, /onCall\(\{ secrets: \[geminiApiKey\] \}/);
  assert.match(functionsIndex, /geminiApiKey\.value\(\)/);
  assert.match(functionsIndex, /exports\.aiAssistant/);
});

test('server-side AI call does not expose the credential to client code', () => {
  assert.match(functionsIndex, /generativelanguage\.googleapis\.com/);
  assert.match(functionsIndex, /encodeURIComponent\(apiKey\)/);
  assert.doesNotMatch(functionsIndex, /import\.meta\.env\.VITE_/);
});

test('AI function runtime remains on supported Node 20', () => {
  assert.match(functionsPackage, /"node"\s*:\s*"20"/);
});
