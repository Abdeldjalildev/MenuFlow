import React from 'react';
import { ShoppingBag, PlusCircle, Tag } from 'lucide-react';

interface Props {
  cartCount: number;
  handleCheckout: () => void;
  themeColor: string;
  hasActiveOrder?: boolean;
  t: (key: string) => string;
  activeDiscount?: number; // 👈 إضافة استقبال الخصم
}

export const CheckoutBar: React.FC<Props> = ({ 
  cartCount, 
  handleCheckout, 
  themeColor, 
  hasActiveOrder = false, 
  t,
  activeDiscount = 0 // 👈 القيمة الافتراضية 0
}) => (
  cartCount > 0 ? (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50">
      <button
        onClick={handleCheckout}
        className="w-full max-w-md mx-auto py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-between px-4 transition-all hover:opacity-90 active:scale-95 shadow-md"
        style={{ backgroundColor: themeColor }}
      >
        <div className="flex items-center gap-2">
          {hasActiveOrder ? <PlusCircle size={18} /> : <ShoppingBag size={18} />}
          <span>
            {hasActiveOrder ? t('addToExistingOrder') : t('checkout')} ({cartCount})
          </span>
        </div>

        {/* 🏷️ شارة تخبر الزبون بالخصم المطبق في الشريط السفلي */}
        {activeDiscount > 0 && (
          <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold shadow-sm">
            <Tag size={12} />
            خصم {activeDiscount}%
          </span>
        )}
      </button>
    </div>
  ) : null
);