import React, { useEffect, type RefObject } from 'react';
import { DeliveryForm } from './DeliveryForm';
import { OrderTracking } from './OrderTracking';
import type { Order } from '../../context/OrderProvider';

export type OrderFeedbackState = 'idle' | 'submitting' | 'success' | 'validation-error' | 'auth-error' | 'network-error' | 'server-rejection';
export interface OrderFeedback { state: OrderFeedbackState; message: string; orderNumber?: number }

interface Props {
  showDeliveryForm: boolean;
  isOrderPlaced: boolean;
  currentOrder: Order | null;
  feedback: OrderFeedback;
  feedbackRef: RefObject<HTMLDivElement | null>;
  onDeliveryConfirm: (name: string, address: string, phone: string) => Promise<void>;
  t: (key: string) => string;
  themeColor: string;
}

const feedbackClass = (state: OrderFeedbackState) => state === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : state === 'submitting' ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200';

export const MenuOrOrderManager: React.FC<Props> = ({ showDeliveryForm, isOrderPlaced, currentOrder, feedback, feedbackRef, onDeliveryConfirm, t, themeColor }) => {
  const trackingRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((showDeliveryForm || isOrderPlaced || feedback.state !== 'idle') && trackingRef.current) {
      trackingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showDeliveryForm, isOrderPlaced, feedback.state]);

  if (!showDeliveryForm && !currentOrder && !isOrderPlaced && feedback.state === 'idle') return null;

  const showFeedback = feedback.state !== 'idle';
  const showTracking = !showDeliveryForm && (currentOrder || isOrderPlaced);

  return (
    <div ref={trackingRef} className="mb-6 space-y-4" aria-busy={feedback.state === 'submitting'}>
      {showFeedback && (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role={feedback.state === 'success' || feedback.state === 'submitting' ? 'status' : 'alert'}
          aria-live={feedback.state === 'submitting' ? 'polite' : 'assertive'}
          className={`rounded-2xl border p-4 text-sm font-semibold outline-none focus:ring-2 ${feedbackClass(feedback.state)}`}
        >
          <p>{feedback.message}</p>
          {feedback.state === 'success' && feedback.orderNumber !== undefined && (
            <p className="mt-2 text-base font-extrabold">{t('orderNumber')}: #{feedback.orderNumber}</p>
          )}
        </div>
      )}
      {showDeliveryForm && <DeliveryForm onConfirm={onDeliveryConfirm} t={t} themeColor={themeColor} disabled={feedback.state === 'submitting'} />}
      {showTracking && <OrderTracking t={t} />}
    </div>
  );
};
