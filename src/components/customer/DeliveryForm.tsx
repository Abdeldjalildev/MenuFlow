import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onConfirm: (name: string, address: string, phone: string) => Promise<void>;
  t: (key: string) => string;
  themeColor: string;
  disabled?: boolean;
}

export const DeliveryForm: React.FC<Props> = ({ onConfirm, t, themeColor, disabled = false }) => {
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [validationError, setValidationError] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (validationError) errorRef.current?.focus(); }, [validationError]);

  const submit = async () => {
    if (!customerName.trim() || !address.trim() || !phone.trim()) {
      setValidationError(t('orderDeliveryRequired'));
      return;
    }
    setValidationError('');
    await onConfirm(customerName.trim(), address.trim(), phone.trim());
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 transition-all" aria-busy={disabled}>
      <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">{t('deliveryDetails')}</h3>
      {validationError && <div ref={errorRef} tabIndex={-1} role="alert" aria-live="assertive" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{validationError}</div>}
      <div className="space-y-4">
        <div>
          <label htmlFor="delivery-name" className="sr-only">{t('enterCustomerName')}</label>
          <input id="delivery-name" type="text" autoComplete="name" placeholder={t('enterCustomerName')} value={customerName} onChange={(e) => setCustomerName(e.target.value)} aria-invalid={Boolean(validationError && !customerName.trim())} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2" disabled={disabled} />
        </div>
        <div>
          <label htmlFor="delivery-address" className="sr-only">{t('enterAddress')}</label>
          <input id="delivery-address" type="text" autoComplete="street-address" placeholder={t('enterAddress')} value={address} onChange={(e) => setAddress(e.target.value)} aria-invalid={Boolean(validationError && !address.trim())} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2" disabled={disabled} />
        </div>
        <div>
          <label htmlFor="delivery-phone" className="sr-only">{t('enterPhone')}</label>
          <input id="delivery-phone" type="tel" autoComplete="tel" placeholder={t('enterPhone')} value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(validationError && !phone.trim())} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2" disabled={disabled} />
        </div>
        <button type="button" onClick={() => void submit()} disabled={disabled} aria-busy={disabled} className="w-full py-3 rounded-xl text-white font-bold transition-all hover:opacity-90 active:scale-95 shadow-md mt-2 disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: themeColor }}>
          {disabled ? t('orderSubmitting') : t('confirmOrder')}
        </button>
      </div>
    </div>
  );
};
