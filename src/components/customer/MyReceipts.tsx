import React, { useState, useContext } from 'react';
import { OrderContext, type Order, type OrderItem } from '../../context/OrderProvider';
import { myReceiptsTranslations } from '../../utils/translations/myReceiptsTranslations';
import { ArrowLeft, Receipt, Star, Clock, MapPin, Phone } from 'lucide-react';

type Language = 'ar' | 'fr' | 'en';
interface MyReceiptsProps { lang: Language; activeOrderId?: string; onBack: () => void; }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const MyReceipts: React.FC<MyReceiptsProps> = ({ lang, activeOrderId, onBack }) => {
  const { orders } = useContext(OrderContext);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(activeOrderId || null);

  const t = (key: string) => {
    const current = myReceiptsTranslations[lang] as Record<string, string>;
    const fallback = myReceiptsTranslations.ar as Record<string, string>;
    return current[key] || fallback[key] || key;
  };

  const safeText = (field: unknown, fallback = ''): string => {
    if (!field) return fallback;
    if (typeof field === 'string' || typeof field === 'number') return String(field);
    if (isRecord(field)) {
      const localized = field[lang] ?? field.ar ?? field.fr ?? field.en;
      return typeof localized === 'string' || typeof localized === 'number' ? String(localized) : fallback;
    }
    return fallback;
  };

  const customerId = localStorage.getItem('menu_customer_id');
  const myOrders = orders.filter((order: Order) => {
    const isMine = !customerId || order.customerId === customerId;
    const isFinished = order.status === 'completed' || order.status === 'paid' || order.status === 'TrackDone';
    return isMine && isFinished;
  });
  const selectedOrder = myOrders.find((order: Order) => order.id === selectedOrderId);

  const formatDate = (timestamp: Order['createdAt']) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'object' && 'toDate' in timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" /></button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('myReceipts')}</h2>
      </div>

      {myOrders.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><Receipt size={48} className="mx-auto mb-4 opacity-40" /><p>{t('noReceipts')}</p></div>
      ) : selectedOrder ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div><h3 className="font-bold text-slate-800 dark:text-white">{t('order')} #{selectedOrder.orderNumber || selectedOrder.id.substring(0, 6)}</h3><p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock size={12} /> {formatDate(selectedOrder.createdAt)}</p></div>
            <button onClick={() => setSelectedOrderId(null)} className="text-xs text-indigo-600 font-bold hover:underline">{t('backToList')}</button>
          </div>
          <div className="p-4">
            {selectedOrder.deliveryData?.address && <div className="flex items-start gap-2 mb-3 text-xs text-slate-600 dark:text-slate-400"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" /><span>{safeText(selectedOrder.deliveryData.address)}</span></div>}
            {selectedOrder.deliveryData?.phone && <div className="flex items-center gap-2 mb-3 text-xs text-slate-600 dark:text-slate-400"><Phone size={14} className="shrink-0 text-slate-400" /><span dir="ltr">{selectedOrder.deliveryData.phone}</span></div>}
            <ul className="space-y-2 mb-4">
              {selectedOrder.items.map((item: OrderItem, idx: number) => <li key={idx} className="flex justify-between text-sm text-slate-700 dark:text-slate-300"><span>{safeText(item.name || item.nameAr, 'Item')} x{item.quantity || 1}</span><span className="font-bold">{((item.price || 0) * (item.quantity || 1)).toLocaleString()} {t('currency')}</span></li>)}
            </ul>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between items-center"><span className="font-bold text-slate-800 dark:text-white">{t('total')}</span><span className="text-lg font-black text-emerald-600">{Number(selectedOrder.totalAmount || selectedOrder.totalPrice || 0).toLocaleString()} {t('currency')}</span></div>
            {selectedOrder.rating && <div className="mt-3 flex items-center gap-1 text-amber-500"><Star size={14} fill="currentColor" /><span className="text-xs font-bold">{selectedOrder.rating}/5</span></div>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {myOrders.map((order: Order) => <button key={order.id} onClick={() => setSelectedOrderId(order.id)} className="w-full text-left bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2"><div><h3 className="font-bold text-sm text-slate-800 dark:text-white">{t('order')} #{order.orderNumber || order.id.substring(0, 6)}</h3><p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5"><Clock size={10} /> {formatDate(order.createdAt)}</p></div><span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">{Number(order.totalAmount || order.totalPrice || 0).toLocaleString()} {t('currency')}</span></div>
            {order.rating && <div className="flex items-center gap-1 text-amber-500 mt-1"><Star size={12} fill="currentColor" /><span className="text-[10px] font-bold">{order.rating}/5</span></div>}
          </button>)}
        </div>
      )}
    </div>
  );
};