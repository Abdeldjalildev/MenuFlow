import React, { useRef, useEffect } from 'react';
import { DeliveryForm } from './DeliveryuForm';
import { OrderTracking } from './OrderTracking';

interface Props {
  showDeliveryForm: boolean;
  isOrderPlaced: boolean;
  currentOrder: any;
  onDeliveryConfirm: (name: string, address: string, phone: string) => void;
  t: (key: string) => string;
  themeColor: string;
}

export const MenuOrOrderManager: React.FC<Props> = ({ 
  showDeliveryForm, 
  isOrderPlaced, 
  currentOrder, 
  onDeliveryConfirm, 
  t, 
  themeColor 
}) => {
  const trackingRef = useRef<HTMLDivElement>(null);

  // منطق التنقل السلس (لم يتغير إطلاقاً)
  useEffect(() => {
    if ((showDeliveryForm || isOrderPlaced) && trackingRef.current) {
      trackingRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showDeliveryForm, isOrderPlaced]);

  // إذا لم نكن في مرحلة التوصيل ولم يتم وضع طلب، لا نعرض شيئاً
  if (!showDeliveryForm && !currentOrder && !isOrderPlaced) return null;

  return (
    <div ref={trackingRef} className="mb-6">
      {showDeliveryForm ? (
        <DeliveryForm onConfirm={onDeliveryConfirm} t={t} themeColor={themeColor} />
      ) : (
        <OrderTracking t={t} />
      )}
    </div>
  );
};