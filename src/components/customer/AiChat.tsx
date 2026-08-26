import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAIResponse } from '../../services/aiServices';
import { type MenuItem } from '../../context/MenuContext';

interface Props {
  menuItems: MenuItem[];
  lang: 'ar' | 'en' | 'fr';
  t: (key: string) => string;
  themeColor?: string;
}

export const AIChat: React.FC<Props> = ({ menuItems, lang, t, themeColor }) => {
  const [userQuery, setUserQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const getRestaurantId = () => {
    return searchParams.get('restaurantId') || localStorage.getItem('restaurantId') || 'default_restaurant';
  };

  const handleAskAI = async () => {
    if (!userQuery.trim()) return;
    setLoading(true);
    try {
      const langNames = { ar: 'العربية', en: 'English', fr: 'Français' };
      const currentRestaurantId = getRestaurantId();

      const menuDetailsSummary = menuItems.length > 0
        ? menuItems.map((item, index) => {
            const name = item.name[lang] || item.name.ar || item.name.en || '';
            const price = item.price || 0;
            const category = item.category || 'عام';
            const description = item.description?.[lang] || item.description?.ar || '';
            return ` ${index + 1}. الوجبة: "${name}" | الفئة: "${category}" | السعر: ${price} | الوصف والمكونات: "${description || 'لا يوجد وصف'}"`;
          }).join('\n')
        : 'المنيو فارغ حالياً أو لم يتم تحميل العناصر.';

      const contextAwarePrompt = ` You are a professional, friendly, and expert AI assistant for the restaurant (Restaurant ID: ${currentRestaurantId}) using the "MenuFlow" platform.
Your task is to help customers choose dishes, explain ingredients, suggest meals based on their preferences, and answer any questions strictly using the restaurant's available menu items listed below.

--- FULL RESTAURANT MENU ---
${menuDetailsSummary}
----------------------------

Instructions:
1. Customer language is: ${langNames[lang]}. Please respond ONLY in ${langNames[lang]}.
2. Be polite, appetizing, and concise.
3. Recommend specific dishes from the menu above with their exact prices when appropriate.
4. If the customer asks for something not available in the menu, kindly inform them and suggest the closest available alternative from the menu.

Customer query: ${userQuery}`;

      const response = await getAIResponse(contextAwarePrompt, menuItems);
      setAiResponse(response);
    } catch {
      setAiResponse(t('aiErrorMessage'));
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-indigo-100 dark:border-slate-800 mb-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🤖</span>
        <h3 className="font-bold text-slate-800 dark:text-white">{t('aiAssistantTitle')}</h3>
      </div>
      <div className="flex flex-col gap-2">
        <input
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
          placeholder={t('aiInputPlaceholder')}
          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-400 outline-none transition-all text-sm"
        />
        <button
          onClick={handleAskAI}
          disabled={loading}
          style={themeColor ? { backgroundColor: themeColor } : {}}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition text-white self-end w-full sm:w-auto shadow-sm active:scale-95 cursor-pointer ${!themeColor ? 'bg-indigo-600 hover:bg-indigo-700' : 'hover:opacity-90'}`}
        >
          {loading ? '...' : t('send')}
        </button>
      </div>
      {aiResponse && (
        <div className="mt-4 p-3 bg-indigo-50 dark:bg-slate-800 rounded-xl text-sm text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-slate-700 italic">
          {aiResponse}
        </div>
      )}
    </div>
  );
};