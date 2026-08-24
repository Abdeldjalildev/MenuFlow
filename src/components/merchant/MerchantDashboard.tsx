import React, { useContext } from 'react';
import { OrderContext } from '../../context/OrderProvider';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface MerchantDashboardProps {
  lang?: Language;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = (props) => {
  // استقبال حالة اللغة الموحدة من الراوتر الأب أو البروبس
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].merchantDashboard;

  const context = useContext(OrderContext);
  const orders = context?.orders || [];
  const updateOrderStatus = context?.updateOrderStatus || (async () => {});

  const activeOrders = orders.filter((o: any) => o.status !== 'paid' && o.status !== 'completed');

  return (
    <div className="p-6 bg-slate-50 min-h-screen" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6 text-slate-800">{t.title}</h1>
      
      <div className="mb-8">
        <AnalyticsDashboard lang={lang} />
      </div>
      
      <div className="space-y-4 max-w-2xl mx-auto">
        <h2 className="font-bold text-lg text-slate-700 mb-4">{t.activeOrdersTitle}</h2>
        {activeOrders.length === 0 ? (
          <p className="text-slate-500 text-center py-10">{t.noOrders}</p>
        ) : (
          activeOrders.map((order: any) => {
            const itemNameKey = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';

            return (
              <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-bold text-lg text-indigo-700">
                      {order.tableNumber === '0' || order.tableNumber === 0
                        ? t.deliveryOrder
                        : t.tableOrder.replace('{tableNumber}', order.tableNumber?.toString() || '')}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {t.dailyOrderNumber.replace('{number}', order.orderNumber || t.unspecifiedNumber)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    order.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {order.status}
                  </span>
                </div>
                
                <ul className="text-sm space-y-1 mb-4 border-t pt-4">
                  {order.items?.map((item: any, idx: number) => {
                    const itemName = item?.menuItem?.name?.[itemNameKey] || item?.menuItem?.name?.ar || item?.name || '';
                    return (
                      <li key={idx} className="flex justify-between text-slate-700 font-medium">
                        <span>{item.quantity}x {itemName}</span>
                      </li>
                    );
                  })}
                </ul>

                {order.status === 'ready' && (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'paid')}
                    className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition"
                  >
                    {t.confirmPaymentBtn}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};