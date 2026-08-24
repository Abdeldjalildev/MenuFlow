import React, { useContext } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { OrderContext } from '../../../context/OrderProvider';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface AnalyticsDashboardProps {
  lang?: Language;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = (props) => {
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';

  const { orders } = useContext(OrderContext);
  const t = translations[lang].analytics;

  const chartData = orders
    .filter((order: any) => order.status === 'paid' || order.status === 'completed')
    .reduce((acc: any[], order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          // 🎯 القراءة المباشرة والدقيقة من الحقول المسجلة فعلياً في الطلبات
          const rawName = item.name || item.nameAr || item.menuItem?.name;
          
          const name = typeof rawName === 'object' && rawName !== null
            ? (rawName[lang] || rawName.ar || rawName.fr || rawName.en || t.unknownItem)
            : (rawName || t.unknownItem);

          const quantity = Number(item.quantity) || 1;

          const existing = acc.find((i) => i.name === name);
          if (existing) {
            existing.sales += quantity;
          } else {
            acc.push({ name: name, sales: quantity });
          }
        });
      }
      return acc;
    }, []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-bold mb-6 text-slate-800">{t.title}</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} orientation={lang === 'ar' ? 'right' : 'left'} />
            <Tooltip formatter={(value: any) => [value, t.salesCount]} />
            <Bar dataKey="sales" fill="#6366f1" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};