import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { customerTranslations } from '../utils/translations/customerTranslations';

interface TableEntryProps {
  onStart: () => void;
  lang: 'ar' | 'en' | 'fr';
  setLang: (lang: 'ar' | 'en' | 'fr') => void;
}

interface ThemeConfig {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  welcomeBgType: 'color' | 'image';
  welcomeBgColor: string;
  welcomeBgImage: string;
  welcomeBgOpacity: number;
  welcomeBgBlur: number;
}

// القيم الافتراضية في حال لم تكن هناك إعدادات محددة من قبل صاحب المطعم
const DEFAULT_THEME: ThemeConfig = {
  logoUrl: '',
  primaryColor: '#4f46e5', // indigo-600
  secondaryColor: '#e0e7ff', // indigo-100
  welcomeBgType: 'color',
  welcomeBgColor: '', // يتغير تلقائياً حسب وضع الداكن/الفاتح الافتراضي
  welcomeBgImage: '',
  welcomeBgOpacity: 100,
  welcomeBgBlur: 0,
};

export const TableEntry: React.FC<TableEntryProps> = ({ 
  onStart, 
  lang, 
  setLang 
}) => {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  // سحب إعدادات الثيم من Firestore مع دعم العزل التام للمطعم
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        // 👈 استخراج معرّف المطعم من الرابط أو التخزين المحلي لضمان العزل
        const queryParams = new URLSearchParams(window.location.search);
        const currentRestaurantId = queryParams.get('restaurantId') || localStorage.getItem('restaurantId') || 'default_restaurant';

        // 👈 جلب الثيم من مسار المطعم المعزول في Firestore
        const themeDoc = await getDoc(doc(db, 'restaurants', currentRestaurantId, 'settings', 'theme'));
        
        if (themeDoc.exists()) {
          const data = themeDoc.data();
          setTheme({
            logoUrl: data.logoUrl || DEFAULT_THEME.logoUrl,
            primaryColor: data.primaryColor || DEFAULT_THEME.primaryColor,
            secondaryColor: data.secondaryColor || DEFAULT_THEME.secondaryColor,
            welcomeBgType: data.welcomeBgType || DEFAULT_THEME.welcomeBgType,
            welcomeBgColor: data.welcomeBgColor || DEFAULT_THEME.welcomeBgColor,
            welcomeBgImage: data.welcomeBgImage || DEFAULT_THEME.welcomeBgImage,
            welcomeBgOpacity: data.welcomeBgOpacity ?? DEFAULT_THEME.welcomeBgOpacity,
            welcomeBgBlur: data.welcomeBgBlur ?? DEFAULT_THEME.welcomeBgBlur,
          });
        }
      } catch (error) {
        console.error('Error fetching theme settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTheme();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const t = (key: keyof typeof customerTranslations['ar']) => {
    return customerTranslations[lang]?.[key] || customerTranslations['ar']?.[key] || key;
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-between p-6 bg-slate-50 dark:bg-slate-950 text-center animate-fade-in transition-colors relative overflow-hidden"
      style={{
        backgroundColor: theme.welcomeBgType === 'color' && theme.welcomeBgColor ? theme.welcomeBgColor : undefined
      }}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* طبقة الصورة الخلفية (إن وجدت وكانت مفعلة) */}
      {theme.welcomeBgType === 'image' && theme.welcomeBgImage && (
        <div 
          className="absolute inset-0 z-0 transition-all pointer-events-none"
          style={{
            backgroundImage: `url(${theme.welcomeBgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: theme.welcomeBgOpacity / 100,
            filter: `blur(${theme.welcomeBgBlur}px)`,
          }}
        />
      )}
         {/* شريط اختيار اللغة */}
      <div className="w-full max-w-sm flex justify-end relative z-50 pt-2">
        <div 
          className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800"
          dir="ltr"
        >
          <Globe size={16} className="text-slate-400 ml-1 mr-0.5" />
          {(['ar', 'en', 'fr'] as const).map((l) => (
            <button 
              key={l} 
              type="button"
              onClick={() => setLang(l)}
              style={{
                backgroundColor: lang === l ? theme.primaryColor : 'transparent'
              }}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer select-none ${
                lang === l 
                  ? 'text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex flex-col items-center my-auto py-8 relative z-10">
        
        {/* الشعار أو الإيقونة الافتراضية */}
        <div 
          style={{ backgroundColor: theme.logoUrl ? 'transparent' : (theme.secondaryColor || undefined) }}
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-md overflow-hidden border-2 border-white/50"
        >
          {theme.logoUrl ? (
            <img src={theme.logoUrl} alt="Restaurant Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">🍽</span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4 drop-shadow-sm">
          {t('welcomeTitle')}
        </h1>
        
        <p className="text-slate-600 dark:text-slate-300 max-w-sm mb-8 leading-relaxed text-sm sm:text-base bg-white/40 dark:bg-slate-900/40 p-3 rounded-2xl backdrop-blur-sm">
          {t('welcomeDesc')}
        </p>

        {/* زر الاستكشاف بلون primaryColor الديناميكي */}
        <button 
          onClick={onStart}
          style={{ backgroundColor: theme.primaryColor }}
          className="px-8 py-4 text-white rounded-2xl font-bold text-base sm:text-lg shadow-lg hover:opacity-90 transition-all active:scale-95 cursor-pointer"
        >
          {t('exploreMenuBtn')}
        </button>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 relative z-10">
        MenuFlow © 2026
      </p>
    </div>
  );
};