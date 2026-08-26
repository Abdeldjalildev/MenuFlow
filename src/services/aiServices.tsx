import type { MenuItem } from '../context/MenuContext';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
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
            text: `أنت مساعد مطعم خبير. هذه هي قائمة الطعام: ${JSON.stringify(menuItems)}. الزبون يقول: "${userPrompt}". أجب باختصار.`
          }]
        }]
      })
    });

    const data: GeminiResponse = await response.json();

    if (!response.ok) {
      console.error('خطأ من جوجل:', data);
      throw new Error(`خطأ ${response.status}: ${data.error?.message || 'Unknown API error'}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return text;
  } catch (error) {
    console.error('فشل الاتصال:', error);
    return 'عذراً، تعذر الوصول للمساعد الذكي حالياً.';
  }
};
