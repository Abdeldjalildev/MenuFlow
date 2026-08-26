import type { MenuItem } from '../context/MenuContext';

interface GeminiErrorResponse {
  error?: { message?: string };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

export const getAIResponse = async (userPrompt: string, menuItems: MenuItem[]): Promise<string> => {
  const apiKey = import.meta.env.VITE_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `أنت مساعد مطعم خبير. هذه هي قائمة الطعام: ${JSON.stringify(menuItems)}. الزبون يقول: "${userPrompt}". أجب باختصار.`,
          }],
        }],
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as GeminiErrorResponse;
      console.error('خطأ من جوجل:', errorData);
      throw new Error(`خطأ ${response.status}: ${errorData.error?.message || 'Unknown API error'}`);
    }

    const data = (await response.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، تعذر الحصول على إجابة حالياً.';
  } catch (error) {
    console.error('فشل الاتصال:', error);
    return 'عذراً، تعذر الوصول للمساعد الذكي حالياً.';
  }
};