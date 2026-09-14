import React from 'react';
import { ShoppingBag, PlusCircle, Tag } from 'lucide-react';

interface Props {
  cartCount: number;
  handleCheckout: () => void | Promise<void>;
  themeColor: string;
  hasActiveOrder?: boolean;
  t: (key: string) => string;
  activeDiscount?: number;
  disabled?: boolean;
}

export const CheckoutBar: React.FC<Props> = ({ cartCount, handleCheckout, themeColor, hasActiveOrder = false, t, activeDiscount = 0, disabled = false }) => (
  cartCount > 0 ? (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50">
      <button
        type="button"
        onClick={() => void handleCheckout()}
        disabled={disabled}
        aria-busy={disabled}
        className="w-full max-w-md mx-auto py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-between px-4 transition-all hover:opacity-90 active:scale-95 shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: themeColor }}
      >
        <div className="flex items-center gap-2">
          {hasActiveOrder ? <PlusCircle size={18} aria-hidden="true" /> : <ShoppingBag size={18} aria-hidden="true" />}
          <span>{disabled ? t('orderSubmitting') : `${hasActiveOrder ? t('addToExistingOrder') : t('checkout')} (${cartCount})`}</span>
        </div>
        {activeDiscount > 0 && <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold shadow-sm"><Tag size={12} aria-hidden="true" />{t('discount')} {activeDiscount}%</span>}
      </button>
    </div>
  ) : null
);
