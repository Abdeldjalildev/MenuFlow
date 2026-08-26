import React from 'react';

interface OrderItem {
  price?: number;
  quantity?: number;
  itemPrice?: number;
}

interface Order {
  id: string;
  status: string;
  totalAmount?: number;
  totalPrice?: number;
  total?: number;
  items?: OrderItem[];
  deliveryFee?: number;
}

interface Props {
  orders: Order[];
  lang?: 'ar' | 'fr' | 'en';
}

export const DeliveryStatsHeader: React.FC<Props> = ({ orders, lang = 'ar' }) => {
  const getOrderFinalPrice = (order: Order): number => {
    const calculatedTotalFromItems = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => {
          const price = Number(item.price || item.itemPrice || 0);
          const qty = Number(item.quantity || 1);
          return sum + price * qty;
        }, 0)
      : 0;

    const price = order.totalPrice ?? order.totalAmount ?? order.total ?? calculatedTotalFromItems;
    return Number(price || 0);
  };

  const deliveredUnpaidOrders = orders.filter((order) => order.status === 'delivered_unpaid');
  const totalPendingCash = deliveredUnpaidOrders.reduce((sum, order) => sum + getOrderFinalPrice(order), 0);

  const texts = {
    ar: {
      title: 'إجمالي النقدية المعلقة بحوزتك',
      subtext: 'المبالغ المجمعة من الطلبات الموصلة وبانتظار التسليم للكاشير',
      ordersCount: 'طلبات موصلة معلقة',
      currency: 'د.ج',
    },
    fr: {
      title: 'Cash En Attente De Remise',
      subtext: 'Montants encaisés des commandes livrées à remettre à la caisse',
      ordersCount: 'Commandes livrées non réglées',
      currency: 'DZD',
    },
    en: {
      title: 'Pending Cash In Hand',
      subtext: 'Collected cash from delivered orders pending cashier settlement',
      ordersCount: 'Delivered Pending Orders',
      currency: 'DZD',
    },
  };

  const t = texts[lang] || texts.ar;

  return (
    <div className="w-full bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 mb-6 shadow-lg border border-emerald-500/30 transition-all">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-2xl">💵</div>
          <div>
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider block">{t.title}</span>
            <div className="text-3xl font-black tracking-tight mt-0.5">
              {totalPendingCash.toLocaleString()} <span className="text-lg font-bold text-emerald-200">{t.currency}</span>
            </div>
            <p className="text-xs text-emerald-100/80 mt-1">{t.subtext}</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 flex items-center gap-3 self-stretch sm:self-auto justify-between">
          <span className="text-xs font-bold text-emerald-100">{t.ordersCount}:</span>
          <span className="text-lg font-black bg-white text-emerald-800 px-3 py-0.5 rounded-xl shadow-sm">{deliveredUnpaidOrders.length}</span>
        </div>
      </div>
    </div>
  );
};