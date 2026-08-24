import React from 'react';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface OverviewProps {
  lang?: Language;
}

export const Overview: React.FC<OverviewProps> = (props) => {
  // استقبال حالة اللغة الموحدة من الراوتر الأب أو البروبس
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].overview;

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
      <AnalyticsDashboard lang={lang} />
    </div>
  );
};