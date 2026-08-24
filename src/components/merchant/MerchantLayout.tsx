import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

type Language = 'ar' | 'fr' | 'en';

export const MerchantLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. إنشاء حالة اللغة الموحدة هنا
  const [lang, setLang] = useState<Language>('ar');

  return (
    <div 
      className="flex bg-[#f8fafc] min-h-screen" 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* 2. تمرير حالة اللغة للقائمة الجانبية */}
      <Sidebar lang={lang} />
      
      {/* 3. تعديل الهامش (Margin) تلقائياً بناءً على اتجاه اللغة */}
      <main className={`flex-1 p-8 min-h-screen transition-all duration-200 ${
        lang === 'ar' ? 'mr-72' : 'ml-72'
      }`}>
        {/* نمرر lang و setLang للأبناء في حال كانت المكونات تحتاجها */}
        {React.isValidElement(children) 
          ? React.cloneElement(children as React.ReactElement<any>, { lang, setLang }) 
          : children}
      </main>
    </div>
  );
};