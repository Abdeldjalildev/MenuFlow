import React, { useRef, useEffect } from 'react';
import { DeliveryForm } from './DeliveryuForm';
import { OrderTracking } from './OrderTracking';
import type { Order } from '../../context/OrderProvider';

interface Props {
  showDeliveryForm: boolean;
  isOrderPlaced: boolean;
  currentOrder: Order | null;
  onDeliveryConfirm: (name: string, address: string, phone: string) => void;
  t: (key: string) => string;
  themeColor: string;
}

export const MenuOrOrderManager: React.FC<Props> = ({ showDeliveryForm, isOrderPlaced, currentOrder, onDeliveryConfirm, t, themeColor }) => {
  const trackingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((showDeliveryForm || isOrderPlaced) && trackingRef.current) {
      trackingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showDeliveryForm, isOrderPlaced]);

  if (!showDeliveryForm && !currentOrder && !isOrderPlaced) return null;

  return (
    <div ref={trackingRef} className="mb-6">
      {showDeliveryForm ? <DeliveryForm onConfirm={onDeliveryConfirm} t={t} themeColor={themeColor} /> : <OrderTracking t={t} />}
    </div>
  );
};