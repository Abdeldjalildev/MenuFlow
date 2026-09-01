import React, { useState, useContext } from 'react';
import { OrderContext } from '../../context/OrderProvider';
import { OrderStatus } from './orderStatus';
import { useMenu } from '../../context/MenuContext';
import { auth } from '../../firebase';

const toDate = (value: Parameters<typeof Date>[0]): Date => value instanceof Date ? value : new Date(value as string | number);
export const OrderTracking: React.FC<{ t: (key: string) => string }> = ({ t }) => {
  const { orders, updateOrderStatus, addReview } = useContext(OrderContext); const { currentTable } = useMenu(); const uid = auth.currentUser?.isAnonymous ? auth.currentUser.uid : null;
  const currentOrder = orders.filter(order => order.tableNumber === currentTable && order.status !== 'TrackDone' && !!uid && order.customerId === uid).sort((a, b) => new Date((b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt ? b.createdAt.toDate() : b.createdAt ?? 0)).getTime() - new Date((a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt ? a.createdAt.toDate() : a.createdAt ?? 0)).getTime())[0];
  const [rating, setRating] = useState(0); const [reviewText, setReviewText] = useState(''); const [submitted, setSubmitted] = useState(false);
  if (!currentOrder) return null;
  const finish = async () => { try { await updateOrderStatus(currentOrder.id, 'TrackDone'); } catch (error) { console.error('Error finishing order:', error); } };
  return <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border shadow-sm mt-4"><h2 className="text-center font-bold mb-4">{t('currentOrderStatus')}</h2><OrderStatus status={currentOrder.status} t={t} isRated={submitted} />
    {(currentOrder.status === 'paid' || currentOrder.status === 'completed' || currentOrder.status === 'delivered_unpaid') && !submitted && <div className="mt-6 border-t pt-6"><h3 className="text-center font-bold mb-4">{t('howWasExperience')}</h3><div className="flex justify-center gap-2 mb-4">{[1,2,3,4,5].map(star => <button key={star} onClick={() => setRating(star)} className={`text-2xl ${rating >= star ? 'scale-125' : 'opacity-40'}`}>⭐️</button>)}</div><textarea placeholder={t('yourFeedback')} className="w-full p-3 border rounded-xl mb-4 text-sm" onChange={e => setReviewText(e.target.value)} /><button onClick={async () => { if (rating > 0) await addReview(currentOrder.id, rating, reviewText); setSubmitted(true); setTimeout(finish, 2000); }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">{t('sendReview')}</button></div>}
    {submitted && <p className="text-center text-green-600 font-bold mt-4">{t('thankYouReview')}</p>}
    {(currentOrder.status === 'completed' || currentOrder.status === 'delivered_unpaid' || currentOrder.status === 'paid') && <div className="mt-4 text-center border-t pt-4"><button onClick={finish} className="bg-slate-800 text-slate-300 text-xs font-bold px-6 py-2.5 rounded-xl">{t('newOrderBtn') || 'طلب جديد 🔄'}</button></div>}
  </div>;
};
