import React from 'react';
import { receiptTranslations } from './receiptTranslations';

type Language = 'ar' | 'fr' | 'en';
type LocalizedText = Partial<Record<Language, string>>;
type ReceiptValue = string | number | LocalizedText | null | undefined;
type ReceiptDate =
  | Date
  | string
  | number
  | { seconds: number }
  | { toDate: () => Date }
  | null
  | undefined;

interface OrderItem {
  name?: ReceiptValue;
  nameAr?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  unitPrice?: number;
}

interface DigitalReceiptProps {
  order: {
    id: string;
    type?: 'local' | 'delivery' | 'takeaway' | string;
    tableName?: string;
    tableNo?: string;
    tableNumber?: string;
    customerName?: string;
    items?: OrderItem[];
    cart?: OrderItem[];
    totalAmount?: number;
    totalPrice?: number;
    createdAt?: ReceiptDate;
  };
  lang?: Language;
  translations?: Record<string, ReceiptValue>;
}

export const DigitalReceipt: React.FC<DigitalReceiptProps> = ({
  order,
  lang = 'ar',
  translations,
}) => {
  const safeText = (field: ReceiptValue, fallback = ''): string => {
    if (field === null || field === undefined || field === '') return fallback;
    if (typeof field === 'string' || typeof field === 'number') return String(field);
    return field[lang] || field.ar || field.fr || field.en || fallback;
  };

  const t = translations || receiptTranslations[lang] || receiptTranslations.ar;

  const getFormattedDate = () => {
    try {
      const rawDate = order.createdAt;
      let date: Date;

      if (
        rawDate &&
        typeof rawDate === 'object' &&
        'toDate' in rawDate &&
        typeof rawDate.toDate === 'function'
      ) {
        date = rawDate.toDate();
      } else if (
        rawDate &&
        typeof rawDate === 'object' &&
        'seconds' in rawDate
      ) {
        date = new Date(rawDate.seconds * 1000);
      } else if (rawDate instanceof Date) {
        date = rawDate;
      } else if (typeof rawDate === 'string' || typeof rawDate === 'number') {
        date = new Date(rawDate);
      } else {
        date = new Date();
      }

      return date.toLocaleString(
        lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US',
        { dateStyle: 'medium', timeStyle: 'short' },
      );
    } catch {
      return new Date().toLocaleString();
    }
  };

  const itemsList = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : Array.isArray(order.cart)
      ? order.cart
      : [];

  const calculatedTotal = itemsList.reduce((sum, item) => {
    const p = Number(item.price ?? item.unitPrice ?? 0);
    const q = Number(item.quantity ?? item.qty ?? 1);
    return sum + p * q;
  }, 0);

  const finalTotal = order.totalAmount ?? order.totalPrice ?? calculatedTotal;
  const rawTable = order.tableNumber || order.tableName || order.tableNo;
  const isDelivery = order.type === 'delivery' || rawTable === '0' || !rawTable;
  const tableIdentifier = rawTable && rawTable !== '0'
    ? rawTable
    : safeText(t?.tableGeneral, 'عامة');

  return (
    <div
      className="max-w-md mx-auto bg-slate-800 text-white rounded-3xl p-6 shadow-2xl border border-slate-700/60 my-4"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="text-center pb-4 border-b border-slate-700">
        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl border border-emerald-500/20">
          🧾
        </div>
        <h2 className="text-xl font-black text-white">
          {safeText(t?.digitalReceiptTitle, 'مطعم MenuFlow')}
        </h2>
        <span className="inline-block mt-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-0.5 rounded-full text-xs font-bold">
          {safeText(t?.paidDigitallyBadge, '✓ فاتورة مدفوعة رقمياً')}
        </span>
        <p className="text-[11px] text-slate-400 mt-2" dir="ltr">{getFormattedDate()}</p>
      </div>

      <div className="py-3 border-b border-slate-700/50 text-xs text-slate-300 flex justify-between items-center">
        <span>{safeText(t?.orderTypeLabel, 'نوع الطلب:')}</span>
        <span className="font-bold text-white">
          {isDelivery
            ? safeText(t?.orderTypeDelivery, '🛵 توصيل خارجي')
            : `${safeText(t?.orderTypeLocal, '🍽 طاولة رقم')} ${tableIdentifier}`}
        </span>
      </div>

      <div className="py-4 space-y-2.5 border-b border-slate-700">
        <span className="text-[10px] text-slate-400 font-bold block mb-1">
          {safeText(t?.orderDetailsLabel, 'تفاصيل الطلب:')}
        </span>
        {itemsList.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-2">لا توجد تفاصيل متاحة</p>
        ) : (
          itemsList.map((item, index) => {
            const itemName = safeText(item.name ?? item.nameAr, 'وجبة');
            const itemPrice = Number(item.price ?? item.unitPrice ?? 0);
            const itemQty = Number(item.quantity ?? item.qty ?? 1);

            return (
              <div key={`${itemName}-${index}`} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-700 px-2 py-0.5 rounded-md font-bold text-slate-200">
                    x{itemQty}
                  </span>
                  <span className="font-medium text-slate-200">{itemName}</span>
                </div>
                <span className="font-bold text-slate-300">
                  {(itemPrice * itemQty).toLocaleString()} {safeText(t?.currency, 'د.ج')}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-4 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-400">
          {safeText(t?.totalPaidLabel, 'الإجمالي المدفوع:')}
        </span>
        <span className="text-2xl font-black text-emerald-400">
          {finalTotal.toLocaleString()} <span className="text-sm font-bold">{safeText(t?.currency, 'د.ج')}</span>
        </span>
      </div>

      <div className="mt-6 text-center bg-slate-900/60 p-3 rounded-2xl border border-slate-700/40">
        <p className="text-xs font-bold text-slate-300">
          {safeText(t?.thankYouMessage, 'شكراً لزيارتكم! نتمنى لكم وجبة شهية ❤️')}
        </p>
        <p className="text-[10px] text-slate-500 mt-1 font-mono">
          {safeText(t?.referenceNumberLabel, 'رقم المرجع:')} #{order.id ? order.id.slice(-8) : '---'}
        </p>
      </div>
    </div>
  );
};
