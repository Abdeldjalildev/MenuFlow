import React, { useState, useContext } from 'react';
import { OrderContext, type Order } from '../../context/OrderProvider';
import { OrderStatus } from './orderStatus';
import { useMenu } from '../../context/MenuContext';

const toDate = (value: Order['createdAt']): Date => {
  if (value && typeof value === 'object' && 'toDate' in value) {
    return value.toDate();
  }
  return new Date(value ?? 0);
};

export const OrderTracking: React.FC<{ t: (key: string) => string }> = ({ t }) => {
  const { orders, updateOrderStatus, addReview } = useContext(OrderContext);
  const { currentTable } = useMenu();

  const customerId = localStorage.getItem('menu_customer_id');

  // Isolate the order to this specific customer and table, excluding finished orders
  const currentOrder = orders
    .filter(
      (order) =>
        order.tableNumber === currentTable &&
        order.status !== 'TrackDone' &&
        (!customerId || order.customerId === customerId)
    )
    .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())[0];

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!currentOrder) return null;

  const handleFinishOrder = async () => {
    try {
      await updateOrderStatus(currentOrder.id, 'TrackDone');
    } catch (error) {
      console.error('Error finishing order:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mt-4">
      <h2 className="text-center font-bold mb-4 text-slate-800 dark:text-white">{t('currentOrderStatus')}</h2>
      
      <OrderStatus
        status={currentOrder.status}
        t={t}
        isRated={submitted}
      />

      {/* Review form */}
      {(currentOrder.status === 'paid' || currentOrder.status === 'completed' || currentOrder.status === 'delivered_unpaid') && !submitted && (
        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
          <h3 className="text-center font-bold mb-4 text-slate-800 dark:text-white">{t('howWasExperience')}</h3>
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-2xl transition-transform ${rating >= star ? 'scale-125' : 'opacity-40'}`}
              >
                ⭐️
              </button>
            ))}
          </div>
          <textarea
            placeholder={t('yourFeedback')}
            className="w-full p-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(e) => setReviewText(e.target.value)}
          />
          <button
            onClick={async () => {
              if (rating > 0) {
                await addReview(currentOrder.id, rating, reviewText);
              }
              setSubmitted(true);
              setTimeout(async () => {
                await handleFinishOrder();
              }, 2000);
            }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm cursor-pointer"
          >
            {t('sendReview')}
          </button>
        </div>
      )}
      
      {submitted && (
        <p className="text-center text-green-600 font-bold mt-4">{t('thankYouReview')}</p>
      )}
      
      {(currentOrder.status === 'completed' || currentOrder.status === 'delivered_unpaid' || currentOrder.status === 'paid') && (
        <div className="mt-4 text-center border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            onClick={handleFinishOrder}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-6 py-2.5 rounded-xl border border-slate-700 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            {t('newOrderBtn') || 'طلب جديد (إغلاق الواجهة) 🔄'}
          </button>
        </div>
      )}
    </div>
  );
};
