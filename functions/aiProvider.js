const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_TIMEOUT_MS = 15000;
const MAX_PROMPT_LENGTH = 12000;
const MAX_MENU_ITEMS = 100;
const MAX_MENU_PAYLOAD_LENGTH = 60000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function validateAIInput(prompt, menuItems) {
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new Error('AI prompt is required.');
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error('AI prompt exceeds the allowed length.');
  }
  if (!Array.isArray(menuItems) || menuItems.length > MAX_MENU_ITEMS) {
    throw new Error('AI menu payload exceeds the allowed item count.');
  }
  let serializedMenu;
  try {
    serializedMenu = JSON.stringify(menuItems);
  } catch {
    throw new Error('AI menu payload is invalid.');
  }
  if (serializedMenu.length > MAX_MENU_PAYLOAD_LENGTH) {
    throw new Error('AI menu payload exceeds the allowed size.');
  }
  return serializedMenu;
}

async function enforceRateLimit(rateKey) {
  const db = getFirestore();
  const ref = db.doc(`aiRateLimits/${rateKey}`);
  const now = Date.now();
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const windowStartedAt = Number(data?.windowStartedAt || now);
    const requestCount = Number(data?.requestCount || 0);
    const windowExpired = now - windowStartedAt >= RATE_LIMIT_WINDOW_MS;
    if (!windowExpired && requestCount >= RATE_LIMIT_MAX_REQUESTS) {
      const error = new Error('AI rate limit exceeded.');
      error.code = 'AI_RATE_LIMITED';
      throw error;
    }
    tx.set(ref, {
      windowStartedAt: windowExpired ? now : windowStartedAt,
      requestCount: windowExpired ? 1 : requestCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function generateGeminiResponse(apiKey, prompt, menuItems, rateKey) {
  const serializedMenu = validateAIInput(prompt, menuItems);
  await enforceRateLimit(rateKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const url = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `أنت مساعد مطعم خبير. هذه هي قائمة الطعام: ${serializedMenu}. الزبون يقول: "${prompt}". أجب باختصار.` }] }],
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('خطأ من خدمة الذكاء الاصطناعي:', response.status, data?.error?.message || 'Unknown API error');
      throw new Error('AI provider request failed.');
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('AI provider returned an empty response.');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  generateGeminiResponse,
  validateAIInput,
  enforceRateLimit,
  MAX_PROMPT_LENGTH,
  MAX_MENU_ITEMS,
  MAX_MENU_PAYLOAD_LENGTH,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
};
