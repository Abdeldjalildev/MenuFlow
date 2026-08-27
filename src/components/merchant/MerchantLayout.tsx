import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

type Language = 'ar' | 'fr' | 'en';
type MerchantChildProps = {
  lang?: Language;
  setLang?: React.Dispatch<React.SetStateAction<Language>>;
};

export const MerchantLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('ar');

  return (
    <div
      className="flex bg-[#f8fafc] min-h-screen"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <Sidebar lang={lang} />

      <main className={`flex-1 p-8 min-h-screen transition-all duration-200 ${
        lang === 'ar' ? 'mr-72' : 'ml-72'
      }`}>
        {React.isValidElement<MerchantChildProps>(children)
          ? React.cloneElement(children, { lang, setLang })
          : children}
      </main>
    </div>
  );
};
