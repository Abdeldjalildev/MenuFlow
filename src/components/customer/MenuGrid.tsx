import React from 'react';
import { type MenuItem } from '../../context/MenuContext';

interface Props {
  items: MenuItem[];
  cart: { [key: string]: number };
  notes: { [key: string]: string };
  onAddToCart: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  themeColor: string;
  lang: 'ar' | 'en' | 'fr';
  t: (key: string) => string;
  activeDiscount?: number; // 👈 إضافة استقبال الخصم
}

export const MenuGrid: React.FC<Props> = ({ 
  items, 
  cart, 
  notes, 
  onAddToCart, 
  onNoteChange, 
  themeColor, 
  lang, 
  t,
  activeDiscount = 0 // 👈 القيمة الافتراضية 0
}) => (
  <div className="mt-5 space-y-4 px-4">
    {items.map((item) => {
      const originalPrice = Number(item.price || 0);
      const hasDiscount = activeDiscount > 0;
      
      // حساب السعر الجديد بعد الخصم المئوي
      const discountedPrice = hasDiscount 
        ? Math.round(originalPrice * (1 - activeDiscount / 100)) 
        : originalPrice;

      return (
        <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex overflow-hidden">
          <img src={item.image} alt={item.name[lang] || item.name['ar']} className="w-28 h-auto object-cover" />
          <div className="p-3 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.name[lang] || item.name['ar']}</h3>
              <p className="text-slate-500 text-xs mt-1 line-clamp-2">{item.description?.[lang] || item.description?.['ar']}</p>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <input 
                type="text"
                placeholder={t('specialNote')}
                value={notes[item.id] || ''}
                onChange={(e) => onNoteChange(item.id, e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-2 py-1 text-[11px]"
              />
              
              {/* 👈 الجزء السفلي: عرض السعر الأصلي مشطوب + الجديد باللون الأخضر عند وجود خصم */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  {hasDiscount ? (
                    <>
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {discountedPrice} <span className="text-xs font-normal">{t('currency')}</span>
                      </span>
                      <span className="text-slate-400 line-through text-xs">
                        {originalPrice}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {originalPrice} <span className="text-xs font-normal text-slate-500">{t('currency')}</span>
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => onAddToCart(item.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 flex items-center gap-1"
                  style={{ backgroundColor: themeColor }}
                >
                  {t('addToCart')} {cart[item.id] ? `(${cart[item.id]})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);