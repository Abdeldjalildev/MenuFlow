const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_TIMEOUT_MS = 15000;

async function generateGeminiResponse(apiKey, prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const url = `${GEMINI_API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(
        'خطأ من خدمة الذكاء الاصطناعي:',
        response.status,
        data?.error?.message || 'Unknown API error',
      );
      throw new Error('AI provider request failed.');
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('AI provider returned an empty response.');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { generateGeminiResponse };
