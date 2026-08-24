import React from 'react';
import { ShoppingBag, Receipt } from 'lucide-react';

interface Props {
  currentTable: string | null;
  lang: 'ar' | 'en' | 'fr';
  themeColor: string;
  logoUrl?: string;
  bannerUrl?: string; // 👈 خاصية صورة البانر كخلفية للهيدر
  t: (key: string) => string;
  onOpenReceipts?: () => void;
}

export const MenuHeader: React.FC<Props> = ({ 
  currentTable, 
  lang, 
  themeColor, 
  logoUrl,
  bannerUrl,
  t, 
  onOpenReceipts 
}) => (
  <header 
    className="top-0 z-50 w-full px-6 py-6 flex items-center justify-between bg-cover bg-center overflow-hidden relative shadow-lg"
    style={{
      backgroundImage: bannerUrl ? `url('${bannerUrl}')` : undefined
    }}
    dir={lang === 'ar' ? 'rtl' : 'ltr'}
  >
    {/* طبقة تظليل خفيفة فوق صورة الخلفية لضمان وضوح النصوص والأيقونات */}
    {bannerUrl && (
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-0"></div>
    )}

    {/* المحتوى العلوي: الشعار، اسم المطعم، ورقم الطاولة */}
    <div className="relative z-10">
      <h1 className="text-xl font-bold flex items-center gap-2 text-white drop-shadow">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt="Logo" 
            className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
          />
        ) : (
          <span className="p-2 rounded-xl text-white" style={{ backgroundColor: themeColor }}>
            <ShoppingBag size={18} />
          </span>
        )}
        {t('appName')}
      </h1>
      <p className="text-xs text-slate-200 mt-0.5 drop-shadow">
        {t('table')} #{currentTable || '0'}
      </p>
    </div>

    {/* الأزرار العلوية: زر الفواتير ومؤشر اللغة */}
    <div className="relative z-10 flex items-center gap-2">
      {onOpenReceipts && (
        <button
          onClick={onOpenReceipts}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 cursor-pointer shadow-sm"
          title={t('receipts') || 'فواتيري'}
        >
          <Receipt size={16} className="text-emerald-500" />
          <span>{t('receipts') || 'فواتيري'}</span>
        </button>
      )}

      <div className="px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm">
        🌐 {lang.toUpperCase()}
      </div>
    </div>
  </header>
);