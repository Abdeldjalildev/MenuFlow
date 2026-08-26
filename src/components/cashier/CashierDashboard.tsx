import { useState, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cashierTranslations } from '../../utils/translations/cashierTranslations';
import { OrderContext } from '../../context/OrderProvider';
import type { Order } from '../../context/OrderProvider';

type Language = 'ar' | 'fr' | 'en';

export default function CashierDashboard() {
  const [activeTab, setActiveTab] = useState<'local' | 'delivery'>('local');
  const [lang, setLang] = useState<Language>('ar');
  const [searchParams] = useSearchParams();
  const { orders, updateOrderStatus } = useContext(OrderContext);

  // Resolve the current restaurant ID to enforce strict data isolation
  const getRestaurantId = () => {
    return (
      searchParams.get('restaurantId') ||
      localStorage.getItem('restaurantId') ||
      'default_restaurant'
    );
  };

  const t = cashierTranslations[lang];
  const currentRestaurantId = getRestaurantId();

  // Safely resolve multilingual or nested text fields
  const safeText = (field: unknown, fallback: string = '') => {
    if (field === null || field === undefined) return fallback;
    if (typeof field === 'string' || typeof field === 'number')
      return String(field);
    if (typeof field === 'object' && field !== null) {
      const record = field as Record<string, string>;
      return record[lang] || record.ar || record.fr || record.en || fallback;
    }
    return fallback;
  };

  // Filter orders by workflow type from the centralized context data
  const localOrders: Order[] = orders.filter(
    (order) =>
      order.restaurantId === currentRestaurantId &&
      order.status === 'ready_for_payment'
  );

  const deliveryOrders: Order[] = orders.filter(
    (order) =>
      order.restaurantId === currentRestaurantId &&
      order.status === 'delivered_unpaid'
  );

  // Confirm payment through the central OrderContext so inventory, loyalty,
  // waste logging, and discount reset all execute consistently.
  const handleConfirmPayment = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'completed');
    } catch (error) {
      console.error('Error updating payment status for order: ', error);
      alert(
        safeText(
          t.paymentErrorAlert,
          'حدث خطأ في الدفع، يرجى المحاولة لاحقاً'
        )
      );
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 p-6 font-sans text-right"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800">
            {safeText(t.title, 'لوحة الكاشير')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{safeText(t.subtitle)}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-200 p-1 rounded-xl border border-slate-300">
            <button
              onClick={() => setLang('ar')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'ar'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇩🇿 ع
            </button>
            <button
              onClick={() => setLang('fr')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'fr'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇫🇷 FR
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'en'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇬🇧 EN
            </button>
          </div>

          <div className="rounded-xl bg-emerald-50 px-4 py-2 border border-emerald-100">
            <span className="text-sm text-emerald-700 font-bold">
              {safeText(t.activePortal)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex space-x-4 space-x-reverse border-b border-slate-200">
        <button
          onClick={() => setActiveTab('local')}
          className={`flex items-center space-x-2 space-x-reverse px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'local'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>{safeText(t.localTab, 'الصالة')}</span>
          <span
            className={`mr-2 rounded-full px-2 py-0.5 text-xs font-black ${
              activeTab === 'local'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {localOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex items-center space-x-2 space-x-reverse px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'delivery'
              ? 'border-blue-500 text-blue-600 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>{safeText(t.deliveryTab, 'التوصيل المعلق')}</span>
          <span
            className={`mr-2 rounded-full px-2 py-0.5 text-xs font-black ${
              activeTab === 'delivery'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {deliveryOrders.length}
          </span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'local' ? (
        /* Local orders tab */
        localOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center text-slate-400">
            <span className="text-4xl block mb-2">📥</span>
            {safeText(t.noLocalOrders, 'لا توجد طلبات')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {localOrders.map((order: Order) => {
              const calculatedTotal = Array.isArray(order.items)
                ? order.items.reduce(
                    (sum, item) =>
                      sum +
                      Number(item.price ?? 0) * Number(item.quantity ?? 1),
                    0
                  )
                : 0;

              const finalPrice =
                order.totalPrice ?? order.totalAmount ?? calculatedTotal;

              return (
                <div
                  key={order.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="bg-linear-to-l from-orange-50 to-white px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <span className="rounded-lg bg-orange-500 px-3 py-1 font-black text-white text-sm">
                      {safeText(t.tablePrefix, 'طاولة ')}
                      {order.tableNumber || '??'}
                    </span>

                    <span className="text-xs font-bold text-orange-600 animate-pulse">
                      {safeText(t.readyForPayment, 'جاهز للدفع')}
                    </span>
                  </div>

                  <div className="p-5 grow">
                    <span className="text-xs text-slate-400 block mb-3">
                      {safeText(t.referenceOrderNo, 'رقم الطلب')} #
                      {order.id.substring(0, 6)}
                    </span>

                    <ul className="space-y-2 border-b border-slate-100 pb-4">
                      {Array.isArray(order.items) &&
                        order.items.map((item, index) => {
                          const itemName = safeText(
                            item.name || item.nameAr,
                            'وجبة'
                          );
                          const itemPrice = Number(item.price ?? 0);
                          const itemQuantity = Number(item.quantity ?? 1);

                          return (
                            <li
                              key={index}
                              className="flex justify-between text-sm text-slate-600 font-medium"
                            >
                              <span>
                                {itemName}{' '}
                                <span className="text-xs text-slate-400">
                                  x{itemQuantity}
                                </span>
                              </span>

                              <span className="text-slate-800">
                                {(itemPrice * itemQuantity).toLocaleString()}{' '}
                                {safeText(t.currency, 'د.ج')}
                              </span>
                            </li>
                          );
                        })}
                    </ul>

                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-500">
                        {safeText(t.totalCostLabel, 'الإجمالي')}
                      </span>

                      <span className="text-xl font-black text-slate-900">
                        {Number(finalPrice).toLocaleString()}{' '}
                        {safeText(t.currency, 'د.ج')}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <button
                      onClick={() => handleConfirmPayment(order.id)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-black py-3 shadow-sm shadow-emerald-200 transition-all cursor-pointer"
                    >
                      {safeText(t.confirmPaymentBtn, 'تأكيد الدفع')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : /* Delivery orders tab */
      deliveryOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center text-slate-400">
          <span className="text-4xl block mb-2">🛵</span>
          {safeText(t.noDeliveryOrders, 'لا توجد طلبات توصيل معلقة')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deliveryOrders.map((order: Order) => {
            const rawCustomerName =
              order.deliveryData?.name || order.customerName;

            const customerName = safeText(
              rawCustomerName,
              safeText(t.unknownCustomer, 'زبون غير معروف')
            );

            const customerPhone =
              order.deliveryData?.phone ||
              order.customerPhone ||
              safeText(t.noPhone, 'بدون رقم');

            const rawAddress =
              order.deliveryData?.address || order.deliveryAddress;

            const deliveryAddress = safeText(
              rawAddress,
              safeText(t.defaultAddress, 'عنوان غير محدد')
            );

            const calculatedTotal = Array.isArray(order.items)
              ? order.items.reduce(
                  (sum, item) =>
                    sum +
                    Number(item.price ?? 0) * Number(item.quantity ?? 1),
                  0
                )
              : 0;

            const finalPrice =
              order.totalPrice ?? order.totalAmount ?? calculatedTotal;

            const driverName = safeText(
              order.driverName,
              safeText(t.unspecifiedDriver, 'السائق')
            );

            return (
              <div
                key={order.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className="bg-linear-to-l from-blue-50 to-white px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">
                      {safeText(t.customerLabel, 'الزبون:')} {customerName}
                    </h3>

                    <p className="text-xs text-slate-400" dir="ltr">
                      {customerPhone}
                    </p>
                  </div>

                  <span className="rounded-lg bg-blue-500 px-2.5 py-1 font-bold text-white text-xs">
                    {safeText(t.driverLabel, 'السائق:')} {driverName}
                  </span>
                </div>

                <div className="p-5 grow">
                  <div className="mb-4 rounded-lg bg-blue-50/50 p-2.5 border border-blue-100/50 text-xs font-medium text-blue-800">
                    {safeText(t.addressLabel, 'العنوان:')} {deliveryAddress}
                  </div>

                  <ul className="space-y-2 border-b border-slate-100 pb-4">
                    {Array.isArray(order.items) &&
                      order.items.map((item, index) => {
                        const itemName = safeText(
                          item.name || item.nameAr,
                          'وجبة'
                        );

                        const itemPrice = Number(item.price ?? 0);
                        const itemQuantity = Number(item.quantity ?? 1);

                        return (
                          <li
                            key={index}
                            className="flex justify-between text-sm text-slate-600 font-medium"
                          >
                            <span>
                              {itemName}{' '}
                              <span className="text-xs text-slate-400">
                                x{itemQuantity}
                              </span>
                            </span>

                            <span className="text-slate-800">
                              {(itemPrice * itemQuantity).toLocaleString()}{' '}
                              {safeText(t.currency, 'د.ج')}
                            </span>
                          </li>
                        );
                      })}
                  </ul>

                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500">
                      {safeText(t.totalRequiredLabel, 'المبلغ التحصيلي')}
                    </span>

                    <span className="text-xl font-black text-slate-900">
                      {Number(finalPrice).toLocaleString()}{' '}
                      {safeText(t.currency, 'د.ج')}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => handleConfirmPayment(order.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-black py-3 shadow-sm shadow-emerald-200 transition-all cursor-pointer"
                  >
                    {safeText(t.confirmDeliveryPaymentBtn, 'استلام المبلغ')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}