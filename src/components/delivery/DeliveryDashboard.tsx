import { useState, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deliveryTranslations } from '../../utils/translations/deliveryTranslations';
import { claimOrderForDriver } from './driverService';
import { OrderContext } from '../../context/OrderProvider';
import type {
  Order,
  OrderItem,
} from '../../context/OrderProvider';

type Language = 'ar' | 'fr' | 'en';

// Strict lifecycle statuses visible to delivery personnel.
const DELIVERY_STATUSES = [
  'preparing',
  'driver_claimed',
  'ready_for_delivery',
  'on_the_way',
  'delivered_unpaid',
] as const;

type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export default function DeliveryDashboard() {
  const [lang, setLang] = useState<Language>('ar');
  const [searchParams] = useSearchParams();
  const { orders, updateOrderStatus } = useContext(OrderContext);

  // Resolve driver identity from localStorage with safe fallbacks.
  const currentDriverId =
    localStorage.getItem('driverId') ||
    localStorage.getItem('userId') ||
    'driver_local_id';

  const currentDriverName =
    localStorage.getItem('userName') ||
    localStorage.getItem('driverName') ||
    'سائق توصيل';

  // Resolve the current restaurant ID to enforce strict data isolation.
  const getRestaurantId = () => {
    return (
      searchParams.get('restaurantId') ||
      localStorage.getItem('restaurantId') ||
      'default_restaurant'
    );
  };

  const t = deliveryTranslations[lang];

  // Safely resolve multilingual or nested text fields.
  const safeText = (field: unknown, fallback: string = '') => {
    if (field === null || field === undefined) return fallback;

    if (typeof field === 'string' || typeof field === 'number') {
      return String(field);
    }

    if (typeof field === 'object' && field !== null) {
      const record = field as Record<string, string>;
      return record[lang] || record.ar || record.fr || record.en || fallback;
    }

    return fallback;
  };

  const currentRestaurantId = getRestaurantId();

  // Derive delivery orders from centralized context with strict, unambiguous filters.
  const deliveryOrders: Order[] = orders.filter((o) => {
    // Restaurant isolation gate.
    if (o.restaurantId !== currentRestaurantId) return false;

    // Strict delivery order identification: must carry explicit delivery metadata.
    const hasDeliveryInfo = !!(o.deliveryData || o.deliveryAddress);
    const isDeliveryOrder =
      (o.tableNumber === '0' && hasDeliveryInfo) || hasDeliveryInfo;
    if (!isDeliveryOrder) return false;

    // Strict status gating: only known delivery lifecycle statuses are permitted.
    if (!DELIVERY_STATUSES.includes(o.status as DeliveryStatus)) return false;

    // Exclude orders locked to another driver to prevent cross-contamination.
    const isLockedByOtherDriver =
      o.isClaimed === true &&
      typeof o.driverId === 'string' &&
      o.driverId.length > 0 &&
      o.driverId !== currentDriverId;
    if (isLockedByOtherDriver) return false;

    return true;
  });

  // Calculate the exact total price for an order.
  const getOrderPrice = (order: Order) => {
    const calculatedTotalFromItems = Array.isArray(order.items)
      ? order.items.reduce(
          (sum: number, item: OrderItem) =>
            sum + Number(item.price || 0) * Number(item.quantity || 1),
          0
        )
      : 0;
    return Number(
      order.totalPrice ?? order.totalAmount ?? calculatedTotalFromItems
    );
  };

  // Calculate pending cash totals for this driver only.
  const myDeliveredUnpaidOrders: Order[] = deliveryOrders.filter(
    (o: Order) => o.status === 'delivered_unpaid' && o.driverId === currentDriverId
  );
  const totalPendingCash = myDeliveredUnpaidOrders.reduce(
    (sum: number, order: Order) => sum + getOrderPrice(order),
    0
  );

  // Claim an available order.
  const handleClaimOrder = async (orderId: string) => {
    const res = await claimOrderForDriver(
      orderId,
      currentDriverId,
      currentDriverName
    );
    if (!res.success) {
      alert(safeText(t.alertError, 'حدث خطأ أثناء حجز الطلب'));
    }
  };

  // Transition order to en-route status.
  const handleMarkAsOnTheWay = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'on_the_way');
    } catch (error) {
      console.error('Error updating status to on the way: ', error);
      alert(safeText(t.alertError, 'حدث خطأ أثناء التحديث'));
    }
  };

  // Final delivery confirmation: hand off to cashier as delivered_unpaid.
  const handleMarkAsDelivered = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'delivered_unpaid');
    } catch (error) {
      console.error('Error updating delivery status: ', error);
      alert(safeText(t.alertError, 'حدث خطأ أثناء التحديث'));
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-900 p-6 font-sans text-slate-100"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <span>🛵</span> {safeText(t.title, 'لوحة التوصيل')}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {safeText(
              t.subtitle,
              'إدارة ومتابعة طلبات التوصيل وحجز الطلبيات'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Language switcher */}
          <div className="flex gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setLang('ar')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'ar'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇩🇿 ع
            </button>
            <button
              onClick={() => setLang('fr')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'fr'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇫🇷 FR
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇬🇧 EN
            </button>
          </div>

          <div className="rounded-xl bg-blue-500/10 px-4 py-2 border border-blue-500/20">
            <span className="text-xs text-blue-400 font-bold">
              {safeText(t.activeAccount, currentDriverName)}
            </span>
          </div>
        </div>
      </div>

      {/* Pending cash summary bar */}
      <div className="w-full bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-5 mb-8 shadow-lg border border-emerald-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-2xl">
            💵
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-100 block">
              {safeText(
                t.totalPendingCashTitle,
                'إجمالي النقدية المعلقة بحوزتك'
              )}
            </span>
            <div className="text-2xl font-black tracking-tight mt-0.5">
              {totalPendingCash.toLocaleString()}{' '}
              <span className="text-sm font-bold text-emerald-200">
                {safeText(t.currency, 'د.ج')}
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/80 mt-0.5">
              {safeText(
                t.totalPendingCashSub,
                'المبالغ المجمعة من الطلبات الموصلة وبانتظار التسليم للكاشير'
              )}
            </p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 flex items-center gap-3 self-stretch sm:self-auto justify-between">
          <span className="text-xs font-bold text-emerald-100">
            {safeText(t.pendingDeliveredCount, 'طلبات موصلة معلقة')}:
          </span>
          <span className="text-base font-black bg-white text-emerald-800 px-2.5 py-0.5 rounded-lg shadow-sm">
            {myDeliveredUnpaidOrders.length}
          </span>
        </div>
      </div>

      {/* Delivery orders grid */}
      {deliveryOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-800/30 p-16 text-center text-slate-500">
          <span className="text-4xl block mb-2">✨</span>
          {safeText(t.noOrders, 'لا توجد طلبات توصيل متاحة')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliveryOrders.map((order: Order) => {
            // Explicit, non-conflated status flags for robust branching.
            const isPreparingStatus = order.status === 'preparing';
            const isDriverClaimedStatus = order.status === 'driver_claimed';
            const isReadyForDelivery = order.status === 'ready_for_delivery';
            const isOnTheWay = order.status === 'on_the_way';
            const isDeliveredUnpaid = order.status === 'delivered_unpaid';

            const isClaimedByMe =
              order.isClaimed === true && order.driverId === currentDriverId;

            // Visual state groups that mirror the original UI logic exactly.
            const isAvailableForClaim =
              (isPreparingStatus || isDriverClaimedStatus) && !isClaimedByMe;
            const isClaimedWaiting =
              (isPreparingStatus || isDriverClaimedStatus) && isClaimedByMe;

            const rawCustomerName =
              order.deliveryData?.name || order.customerName;
            const customerName = safeText(
              rawCustomerName,
              safeText(t.anonymousCustomer, 'زبون غير مسمى')
            );

            const customerPhone =
              order.deliveryData?.phone || order.customerPhone;
            const rawAddress =
              order.deliveryData?.address || order.deliveryAddress;
            const deliveryAddress = safeText(
              rawAddress,
              safeText(t.defaultAddress, 'عنوان غير محدد')
            );

            const finalPrice = getOrderPrice(order);

            return (
              <div
                key={order.id}
                className={`flex flex-col rounded-2xl border transition-all overflow-hidden ${
                  isDeliveredUnpaid
                    ? 'border-slate-700 bg-slate-800/60 opacity-60 pointer-events-none'
                    : isAvailableForClaim
                    ? 'border-amber-500/40 bg-slate-800/60 opacity-60 filter blur-[0.5px]'
                    : isClaimedWaiting
                    ? 'border-purple-500/50 bg-slate-800 shadow-xl'
                    : 'border-slate-800 bg-slate-800 shadow-xl'
                }`}
              >
                {/* Card header */}
                <div className="bg-slate-800/80 px-5 py-4 border-b border-slate-700/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-white text-sm">
                      {safeText(t.customerLabel, 'الزبون')}: {customerName}
                    </h3>
                    {customerPhone ? (
                      <a
                        href={`tel:${customerPhone}`}
                        className="text-xs text-blue-400 font-mono underline block mt-0.5"
                        dir="ltr"
                      >
                        📞 {customerPhone}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500 block mt-0.5">
                        {safeText(t.noPhone, 'بدون رقم')}
                      </span>
                    )}
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 font-bold text-xs ${
                      isDeliveredUnpaid
                        ? 'bg-slate-700 text-slate-400'
                        : isOnTheWay
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : isAvailableForClaim
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : isClaimedWaiting
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {isDeliveredUnpaid
                      ? safeText(t.statusDelivered, 'تم التوصيل')
                      : isOnTheWay
                      ? lang === 'ar'
                        ? 'قيد التوصيل في الطريق'
                        : 'On The Way'
                      : isAvailableForClaim
                      ? lang === 'ar'
                        ? 'قيد التحضير (متاح للحجز)'
                        : 'Preparing (Available)'
                      : isClaimedWaiting
                      ? lang === 'ar'
                        ? 'محجوز (بانتظار المطبخ)'
                        : 'Claimed (Waiting Kitchen)'
                      : safeText(t.statusInTransit, 'جاهز للتوصيل')}
                  </span>
                </div>

                {/* Address and order contents */}
                <div className="p-5 grow">
                  <div className="mb-4 rounded-xl bg-slate-900/80 p-3 border border-slate-700 text-xs font-medium text-slate-300">
                    <span className="text-slate-500 font-bold block mb-1">
                      {safeText(t.addressLabel, 'العنوان')}
                    </span>
                    <span className="text-white font-bold text-sm">
                      {deliveryAddress}
                    </span>
                  </div>

                  {/* Claiming driver name */}
                  {order.driverName && (
                    <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 font-medium">
                      <span>
                        👤{' '}
                        {lang === 'ar'
                          ? 'تم الحجز بواسطة:'
                          : 'Claimed by:'}{' '}
                      </span>
                      <strong className="text-white">
                        {order.driverName}
                      </strong>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 block mb-2">
                    {safeText(t.bagContents, 'محتويات الحقيبة')}
                  </span>
                  <ul className="space-y-1.5 border-b border-slate-700 pb-4">
                    {Array.isArray(order.items) &&
                      order.items.map((item: OrderItem, index: number) => {
                        const itemName = safeText(
                          item.name || item.nameAr,
                          'وجبة'
                        );
                        const noteText = safeText(item.note);

                        return (
                          <li
                            key={index}
                            className="flex justify-between items-center text-xs text-slate-400"
                          >
                            <span>
                              • {itemName}{' '}
                              {noteText ? (
                                <span className="text-amber-400 text-[11px]">
                                  ({noteText})
                                </span>
                              ) : (
                                ''
                              )}
                            </span>
                            <span className="font-bold text-slate-300">
                              x{item.quantity}
                            </span>
                          </li>
                        );
                      })}
                  </ul>

                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">
                      {safeText(
                        t.collectAmountLabel,
                        'المبلغ المراد تحصيله'
                      )}
                    </span>
                    <span className="text-lg font-black text-emerald-400">
                      {Number(finalPrice).toLocaleString()}{' '}
                      {safeText(t.currency, 'د.ج')}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="p-4 bg-slate-900/40 border-t border-slate-700/50">
                  {isDeliveredUnpaid ? (
                    <div className="text-center py-2 bg-slate-800 rounded-xl text-xs font-bold text-slate-500">
                      {safeText(
                        t.cashierPendingText,
                        'بانتظار التحصيل في الكاشير'
                      )}
                    </div>
                  ) : isPreparingStatus && !isClaimedByMe ? (
                    <button
                      onClick={() => handleClaimOrder(order.id)}
                      className="w-full flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black py-3 shadow-md shadow-purple-900/20 transition-all cursor-pointer"
                    >
                      {lang === 'ar'
                        ? '⚡️ حجز الطلبية (Claim)'
                        : '⚡️ Claim Order'}
                    </button>
                  ) : (isPreparingStatus || isDriverClaimedStatus) && isClaimedByMe ? (
                    <div className="text-center py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-bold text-amber-400">
                      {lang === 'ar'
                        ? '⏳ تم الحجز - بانتظار إتمام المطبخ (Ready)'
                        : '⏳ Claimed - Waiting Kitchen'}
                    </div>
                  ) : isReadyForDelivery && isClaimedByMe ? (
                    <button
                      onClick={() => handleMarkAsOnTheWay(order.id)}
                      className="w-full flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black py-3 shadow-md shadow-amber-900/20 transition-all cursor-pointer"
                    >
                      {lang === 'ar'
                        ? '🛵 انطلاق (قيد التوصيل)'
                        : '🛵 Start Delivery (On The Way)'}
                    </button>
                  ) : isReadyForDelivery && !isClaimedByMe ? (
                    <button
                      onClick={() => handleClaimOrder(order.id)}
                      className="w-full flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black py-3 shadow-md shadow-purple-900/20 transition-all cursor-pointer"
                    >
                      {lang === 'ar'
                        ? '⚡️ حجز الطلبية (Claim)'
                        : '⚡️ Claim Order'}
                    </button>
                  ) : isOnTheWay && isClaimedByMe ? (
                    <button
                      onClick={() => handleMarkAsDelivered(order.id)}
                      className="w-full flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-3 shadow-md shadow-blue-900/20 transition-all cursor-pointer"
                    >
                      {safeText(t.confirmDeliveryBtn, 'تأكيد التوصيل')}
                    </button>
                  ) : (
                    <div className="text-center py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-bold text-slate-500">
                      {lang === 'ar'
                        ? 'حالة غير معالجة'
                        : 'Unhandled status state'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
