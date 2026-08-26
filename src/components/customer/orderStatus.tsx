import React from 'react';
import { motion } from 'framer-motion';
import { type OrderStatus as OrderStatusValue } from '../../context/OrderProvider';

const getStages = (t: (key: string) => string) => [
  { id: 'pending', label: t('stagePending') },
  { id: 'preparing', label: t('stagePreparing') },
  { id: 'ready', label: t('stageReady') },
  { id: 'on_the_way', label: t('stageOnTheWay') || 'قيد التوصيل' },
  { id: 'paid', label: t('stagePaid') },
  { id: 'review', label: t('stageReview') },
];

interface OrderStatusProps {
  status: OrderStatusValue;
  t: (key: string) => string;
  isRated?: boolean;
}

export const OrderStatus: React.FC<OrderStatusProps> = ({ status, t, isRated }) => {
  const stages = getStages(t);
  let visualStatus = 'pending';

  if (status === 'pending') visualStatus = 'pending';
  else if (status === 'preparing') visualStatus = 'preparing';
  else if (status === 'ready' || status === 'ready_for_payment' || status === 'ready_for_delivery') visualStatus = 'ready';
  else if (status === 'on_the_way') visualStatus = 'on_the_way';
  else if (status === 'delivered_unpaid' || status === 'paid' || status === 'completed') visualStatus = 'paid';
  else if (status === 'TrackDone') visualStatus = 'review';

  const currentStageIndex = stages.findIndex((s) => s.id === visualStatus);

  return (
    <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🛵</span>
      </motion.div>
      <h2 className="text-lg font-bold mb-6 text-slate-800 dark:text-white">
        {visualStatus === 'pending' && t('statusPendingMsg')}
        {visualStatus === 'preparing' && t('statusPreparingMsg')}
        {visualStatus === 'ready' && t('statusReadyMsg')}
        {visualStatus === 'on_the_way' && (t('statusOnTheWayMsg') || 'الطلب في طريقه إليك الآن 🛵')}
        {visualStatus === 'paid' && t('statusPaidMsg')}
      </h2>
      <div className="relative flex justify-between items-center px-2">
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
        {stages.map((stage, i) => (
          <div key={stage.id} className="relative z-10 flex flex-col items-center">
            <motion.div initial={false} animate={{ backgroundColor: (i <= currentStageIndex || isRated) ? '#4f46e5' : '#e2e8f0', scale: i === currentStageIndex ? 1.1 : 1 }} className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm text-white text-xs font-bold">
              {i + 1}
            </motion.div>
            <span className={`text-[10px] mt-2 font-medium ${i <= currentStageIndex || isRated ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};