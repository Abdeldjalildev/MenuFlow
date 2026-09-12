import React, { useState, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OrderContext, type Order, type OrderItem } from '../../context/OrderProvider';
import { formatDistanceToNow } from 'date-fns';
import { ar, fr, enUS } from 'date-fns/locale';
import { kitchenTranslations } from '../../utils/translations/kitchenTranslations';

type Language = 'ar' | 'fr' | 'en';

export const KitchenDashboard: React.FC = () => {
  const { orders, updateOrderStatus } = useContext(OrderContext);
  const [lang, setLang] = useState<Language>('ar');
  const [searchParams] = useSearchParams();

  // Resolve the current restaurant ID with full fallback protection
  const getRestaurantId = () => {
    try {
      const paramId = searchParams.get('restaurantId');
      if (paramId) {
        localStorage.setItem('restaurantId', paramId);
        return paramId;
      }
      return localStorage.getItem('restaurantId') || 'default_restaurant';
    } catch {
      return 'default_restaurant';
    }
  };

  const safeText = (field: unknown, fallback: string = ''): string => {
    if (!field) return fallback;
    if (typeof field === 'string' || typeof field === 'number') return String(field);
    if (typeof field === 'object' && field !== null) {
      const localized = field as Record<string, unknown>;
      const value = localized[lang] ?? localized.ar ?? localized.fr ?? localized.en;
      return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
    }
    return fallback;
  };

  const t = (key: keyof typeof kitchenTranslations['ar']) => {
    return kitchenTranslations[lang]?.[key] || kitchenTranslations['ar']?.[key] || key;
  };

  const getDateLocale = () => {
    if (lang === 'fr') return fr;
    if (lang === 'en') return enUS;
    return ar;
  };

  const currentRestaurantId = getRestaurantId();

  // Filter active orders: show them, dim finished ones, hide paid/completed entirely
  const activeOrders = orders.filter((o: Order) => {
    const matchesRestaurant = o.restaurantId ? o.restaurantId === currentRestaurantId : true;
    const status = o.status;

    // Exclude orders that are fully paid or completed so they disappear completely
    const isFinished = status === 'paid' || status === 'completed' || status === 'TrackDone';

    return matchesRestaurant && !isFinished;
  });

  const deliveryOrders = activeOrders.filter((o: Order) => o.tableNumber === '0');
  const tableOrders = activeOrders.filter((o: Order) => o.tableNumber !== '0');

  const getElapsedTime = (createdAt: Order['createdAt']) => {
    if (!createdAt) return t('notAvailable');
    const date = typeof createdAt === 'object' && 'toDate' in createdAt
      ? createdAt.toDate()
      : new Date(createdAt);
    if (isNaN(date.getTime())) return t('notAvailable');
    return formatDistanceToNow(date, { addSuffix: true, locale: getDateLocale() });
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const currentStatus = order.status;

    // Include on_the_way so the card dims once the driver departs
    const isReadyForNextStep =
      currentStatus === 'ready_for_payment' ||
      currentStatus === 'ready_for_delivery' ||
      currentStatus === 'on_the_way' ||
      currentStatus === 'delivered_unpaid';

    // Detect newly appended items so the kitchen can still interact with the card
    const hasAppendedItems = Array.isArray(order.items) && order.items.some((item: OrderItem) => item.isAppended);

    const handleMarkAsReady = () => {
      if (order.tableNumber === '0') {
        updateOrderStatus(order.id, 'ready_for_delivery');
      } else {
        updateOrderStatus(order.id, 'ready_for_payment');
      }
    };

    const deliveryAddress = safeText(order.deliveryData?.address || order.deliveryAddress);
    const deliveryPhone = safeText(order.deliveryData?.phone || order.customerPhone);

    return (
      <div className={`bg-white p-6 rounded-3xl shadow-md border border-slate-100 mb-6 transition-all hover:shadow-lg ${
        isReadyForNextStep && !hasAppendedItems ? 'opacity-40 pointer-events-none filter blur-[0.5px]' : ''
      }`}>
        <div className="flex justify-between items-start mb-5 border-b pb-4">
        <div>
            <h2 className="font-extrabold text-xl text-indigo-800">
              {order.tableNumber === '0'
                ? t('deliveryOrderTitle')
                : `${t('tableOrderTitle')}${order.tableNumber}`}
            </h2>
            <p className="text-sm font-bold text-slate-500 mt-1">
              {t('orderNumber')}: #{order.orderNumber || order.id?.substring(0, 5) || t('notSpecified')}
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {getElapsedTime(order.createdAt)}
          </span>
        </div>

        {/* Show address and phone for external delivery orders */}
        {(deliveryAddress || deliveryPhone) && (
          <div className="bg-amber-50 p-4 rounded-2xl mb-4 text-sm border border-amber-100">
            {deliveryAddress && <p className="text-amber-900"><strong>{t('address')}:</strong> {deliveryAddress}</p>}
            {deliveryPhone && <p className="text-amber-900 mt-1"><strong>{t('phone')}:</strong> {deliveryPhone}</p>}
          </div>
        )}

        {/* Show the driver's name to the kitchen as soon as the order is claimed */}
        {order.driverName && (
          <div className="bg-blue-50 p-3 rounded-2xl mb-4 text-xs border border-blue-100 flex items-center gap-2 text-blue-900">
            <span>👤</span>
            <span><strong>{lang === 'ar' ? 'تم حجز الطلب بواسطة السائق:' : 'Claimed by driver:'}</strong> {order.driverName}</span>
          </div>
        )}

        {/* Item list with newly appended items highlighted */}
        <ul className="text-sm space-y-3 mb-6">
          {Array.isArray(order.items) && order.items.map((item: OrderItem, idx: number) => {
            const rawName = item.name || item.nameAr;
            const itemName = safeText(rawName, t('defaultProductName'));
            const noteText = safeText(item.note || item.notes);
            const isAppended = !!item.isAppended;

            return (
              <li
                key={item.id || item.menuItemId || idx}
                className={`flex justify-between items-center p-2.5 rounded-xl border transition-all ${
                  isAppended
                    ? 'bg-amber-100/80 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700/50 shadow-sm'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">
                    {item.quantity || item.qty || 1}x {itemName}
                  </span>

                  {isAppended && (
                    <span className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                      ✨ {t('appendedItem')}
                    </span>
                  )}
                </div>

                {noteText && (
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-xs italic border border-amber-200">
                    ({noteText})
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex gap-3">
          {currentStatus === 'pending' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'preparing')}
              className="flex-1 bg-amber-500 text-white py-3 rounded-2xl font-bold hover:bg-amber-600 transition shadow-md"
            >
              {t('startPreparing')}
            </button>
          )}

          {/* Allow marking ready whether the order is preparing or already claimed by a driver */}
          {(currentStatus === 'preparing' || currentStatus === 'driver_claimed') && (
            <button
              onClick={handleMarkAsReady}
              className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition shadow-md"
            >
              {t('readyFully')}
            </button>
          )}
          {/* Status messages at the bottom of the card, including the en-route state */}
          {isReadyForNextStep && (
            <div className="flex-1 text-center py-2.5 bg-slate-100 rounded-2xl text-xs font-bold text-slate-500">
              {currentStatus === 'ready_for_payment' && t('waitingCashierPayment')}
              {currentStatus === 'ready_for_delivery' && t('waitingDeliveryDriver')}
              {currentStatus === 'on_the_way' && (lang === 'ar' ? '🚚 جاري التوصيل...' : lang === 'fr' ? '🚚 En cours de route...' : '🚚 On the way...')}
              {currentStatus === 'delivered_unpaid' && t('deliveredWaitingCash')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>

        <div className="flex gap-2 bg-slate-200 p-1.5 rounded-2xl shadow-inner">
          <button
            onClick={() => setLang('ar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              lang === 'ar' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            العربية 🇩🇿
          </button>
          <button
            onClick={() => setLang('fr')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              lang === 'fr' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Français 🇫🇷
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              lang === 'en' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English 🇬🇧
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
          <h2 className="text-xl font-bold mb-4 text-amber-800 flex items-center gap-2">
            🚚 {t('deliveryOrders')} ({deliveryOrders.length})
          </h2>
          {deliveryOrders.length === 0 ? (
            <p className="text-slate-400 italic text-center py-10">{t('noDeliveryOrders')}</p>
          ) : (
            deliveryOrders.map((order: Order) => <OrderCard key={order.id} order={order} />)
          )}
        </div>

        <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
          <h2 className="text-xl font-bold mb-4 text-indigo-800 flex items-center gap-2">
            🍽 {t('tableOrders')} ({tableOrders.length})
          </h2>
          {tableOrders.length === 0 ? (
            <p className="text-slate-400 italic text-center py-10">{t('noTableOrders')}</p>
          ) : (
            tableOrders.map((order: Order) => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      </div>
    </div>
  );
};
