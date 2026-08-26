import React, { useContext } from 'react';
import { OrderContext, type Order } from '../../context/OrderProvider';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';
interface MerchantDashboardProps { lang?: Language; }

const getStatusBadgeClasses = (status: string): string => {
  switch (status) {
    case 'pending': return 'bg-amber-100 text-amber-700';
    case 'preparing': return 'bg-blue-100 text-blue-700';
    case 'driver_claimed': return 'bg-purple-100 text-purple-700';
    case 'ready':
    case 'ready_for_payment':
    case 'ready_for_delivery': return 'bg-emerald-100 text-emerald-700';
    case 'on_the_way': return 'bg-sky-100 text-sky-700';
    case 'delivered_unpaid': return 'bg-orange-100 text-orange-700';
    case 'paid':
    case 'completed':
    case 'TrackDone': return 'bg-slate-100 text-slate-500';
    default: return 'bg-slate-100 text-slate-600';
  }
};

export const MerchantDashboard: React.FC<MerchantDashboardProps> = (props) => {
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].merchantDashboard;
  const context = useContext(OrderContext);
  const orders = context.orders;
  const updateOrderStatus = context.updateOrderStatus;
  const terminalStatuses = ['paid', 'completed', 'delivered_unpaid', 'TrackDone', 'on_the_way'];
  const activeOrders = orders.filter((order: Order) => !terminalStatuses.includes(order.status));

  return (
    <div className="p-6 bg-slate-50 min-h-screen" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6 text-slate-800">{t.title}</h1>
      <div className="mb-8"><AnalyticsDashboard lang={lang} /></div>
      <div className="space-y-4 max-w-2xl mx-auto">
        <h2 className="font-bold text-lg text-slate-700 mb-4">{t.activeOrdersTitle}</h2>
        {activeOrders.length === 0 ? <p className="text-slate-500 text-center py-10">{t.noOrders}</p> : activeOrders.map((order: Order) => {
          const itemNameKey = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
          return (
            <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-bold text-lg text-indigo-700">{order.tableNumber === '0' ? t.deliveryOrder : t.tableOrder.replace('{tableNumber}', order.tableNumber || '')}</h2>
                  <p className="text-xs text-slate-400 mt-1">{t.dailyOrderNumber.replace('{number}', String(order.orderNumber || t.unspecifiedNumber))}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadgeClasses(order.status)}`}>{order.status}</span>
              </div>
              <ul className="text-sm space-y-1 mb-4 border-t pt-4">
                {order.items?.map((item, idx) => {
                  const rawName = item.name;
                  const itemName = typeof rawName === 'object' ? (rawName[itemNameKey] || rawName.ar || '') : (rawName || item.nameAr || '');
                  return <li key={idx} className="flex justify-between text-slate-700 font-medium"><span>{item.quantity}x {itemName}</span></li>;
                })}
              </ul>
              {(order.status === 'ready' || order.status === 'ready_for_payment') && <button onClick={() => updateOrderStatus(order.id, 'paid')} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition">{t.confirmPaymentBtn}</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
};