import React, { useContext } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { OrderContext, type OrderItem } from '../../../context/OrderProvider';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface AnalyticsDashboardProps {
  lang?: Language;
}

interface ChartEntry {
  name: string;
  sales: number;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = (props) => {
  const outletContext = useOutletContext<{ lang?: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';

  const { orders } = useContext(OrderContext);
  const t = translations[lang].analytics;

  const chartData = orders
    .filter((order) => order.status === 'paid' || order.status === 'completed')
    .reduce<ChartEntry[]>((acc, order) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: OrderItem) => {
          // 🎯 القراءة المباشرة والدقيقة من الحقول المسجلة فعلياً في الطلبات
          const rawName = item.name || item.nameAr;

          const name = typeof rawName === 'object' && rawName !== null
            ? (rawName[lang] || rawName.ar || rawName.fr || rawName.en || t.unknownItem)
            : (rawName || t.unknownItem);

          const quantity = Number(item.quantity ?? item.qty) || 1;

          const existing = acc.find((entry) => entry.name === name);
          if (existing) {
            existing.sales += quantity;
          } else {
            acc.push({ name, sales: quantity });
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
            <Tooltip formatter={(value: unknown) => [value, t.salesCount]} />
            <Bar dataKey="sales" fill="#6366f1" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
