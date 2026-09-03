import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import type { MenuItem } from '../context/MenuContext';

interface AIResponse {
  text: string;
}

const aiAssistant = httpsCallable<
  { userPrompt: string; menuItems: MenuItem[] },
  AIResponse
>(getFunctions(app), 'aiAssistant');

export const getAIResponse = async (userPrompt: string, menuItems: MenuItem[]): Promise<string> => {
  try {
    const result = await aiAssistant({ userPrompt, menuItems });
    const text = result.data?.text;

    if (!text) {
      throw new Error('AI service returned an empty response');
    }

    return text;
  } catch (error) {
    console.error('فشل الاتصال بخدمة الذكاء الاصطناعي:', error);
    return 'عذراً، تعذر الوصول للمساعد الذكي حالياً.';
  }
};
