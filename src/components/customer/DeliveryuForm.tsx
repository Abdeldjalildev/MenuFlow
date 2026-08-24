import React, { useState } from 'react';

interface Props {
  onConfirm: (name: string, address: string, phone: string) => void;
  t: (key: string) => string;
  themeColor: string;
}

export const DeliveryForm: React.FC<Props> = ({ onConfirm, t, themeColor }) => {
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 transition-all">
      <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">
        {t('deliveryDetails')}
      </h3>
      
      <div className="space-y-4">
        {/* خانة اسم الزبون / معرف الطلب */}
        <input
          type="text"
          placeholder={t('enterCustomerName')}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2"
        />

        {/* خانة العنوان بالتفصيل */}
        <input
          type="text"
          placeholder={t('enterAddress')}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2"
        />

        {/* خانة رقم الهاتف */}
        <input
          type="tel"
          placeholder={t('enterPhone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2"
        />

        <button
          onClick={() => onConfirm(customerName, address, phone)}
          className="w-full py-3 rounded-xl text-white font-bold transition-all hover:opacity-90 active:scale-95 shadow-md mt-2"
          style={{ backgroundColor: themeColor }}
        >
          {t('confirmOrder')}
        </button>
      </div>
    </div>
  );
};