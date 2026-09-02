import React, { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMenu } from '../../context/MenuContext';
import type { MenuItem } from '../../context/MenuContext';
import { useCart } from '../../context/CartContext';
import { OrderContext } from '../../context/OrderProvider';
import { TableEntry } from '../../pages/TableEntry';
import { AIChat } from './AiChat';
import { MenuHeader } from './MenuHeader';
import { CategoryTabs } from './CategoryTabs';
import { MenuGrid } from './MenuGrid';
import { CheckoutBar } from './CheckoutBar';
import { MenuOrOrderManager } from './MenuOrderManager';
import { MyReceipts } from '../customer/MyReceipts';
import { customerTranslations } from '../../utils/translations/customerTranslations';
import { auth, db } from '../../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Tag } from 'lucide-react';

interface ThemeConfig { logoUrl: string; primaryColor: string; secondaryColor: string; menuBgType: 'color' | 'image'; menuBgColor: string; menuBgImage: string; menuBgOpacity: number; menuBgBlur: number; menuBannerUrl: string }
const DEFAULT_THEME: ThemeConfig = { logoUrl: '', primaryColor: '#4f46e5', secondaryColor: '#e0e7ff', menuBgType: 'color', menuBgColor: '', menuBgImage: '', menuBgOpacity: 100, menuBgBlur: 0, menuBannerUrl: '' };

export const CustomerMenu: React.FC = () => {
  const { menuItems, themeColor, currentTable } = useMenu();
  const { orders, placeOrder, appendToOrder } = useContext(OrderContext);
  const { cart, notes, handleAddToCart, updateNote, cartCount, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const [hasStarted, setHasStarted] = useState(false); const [isOrderPlaced, setIsOrderPlaced] = useState(false); const [showDeliveryForm, setShowDeliveryForm] = useState(false); const [activeCategory, setActiveCategory] = useState('all'); const [showReceipts, setShowReceipts] = useState(false); const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME); const [activeDiscount, setActiveDiscount] = useState(0);
  const [lang, setLangState] = useState<'ar' | 'en' | 'fr'>(() => { const saved = localStorage.getItem('app_lang'); return saved === 'en' || saved === 'fr' || saved === 'ar' ? saved : 'ar'; });
  const setLang = (value: 'ar' | 'en' | 'fr') => { setLangState(value); localStorage.setItem('app_lang', value); };
  const t = (key: string) => customerTranslations[lang]?.[key as keyof typeof customerTranslations.ar] || customerTranslations.ar?.[key as keyof typeof customerTranslations.ar] || key;
  const restaurantId = searchParams.get('restaurantId') || localStorage.getItem('restaurantId') || 'default_restaurant';
  const customerUid = auth.currentUser?.isAnonymous ? auth.currentUser.uid : undefined;

  useEffect(() => { getDoc(doc(db, 'restaurants', restaurantId, 'settings', 'theme')).then(snap => { if (snap.exists()) { const d = snap.data(); setTheme({ ...DEFAULT_THEME, ...d, menuBannerUrl: d.menuBannerUrl || d.bannerUrl || '' }); } }).catch(error => console.error('Error fetching theme:', error)); }, [restaurantId]);
  useEffect(() => { if (!customerUid) return; return onSnapshot(doc(db, 'restaurants', restaurantId, 'customers', customerUid), snap => { if (snap.exists()) setActiveDiscount(Number(snap.data().activeDiscount || 0)); }); }, [restaurantId, customerUid]);

  const prepareOrderPayloadData = () => { let totalAmount = 0; const formattedItems = Object.keys(cart).map(id => { const item: MenuItem | undefined = menuItems.find(m => m.id === id || m._id === id); const quantity = cart[id]; const originalPrice = Number(item?.price || 0); const price = activeDiscount > 0 ? originalPrice * (1 - activeDiscount / 100) : originalPrice; totalAmount += price * quantity; const nameAr = item?.name?.ar || ''; return { id, menuItemId: id, recipeId: item?.recipeId || null, name: nameAr || 'وجبة', nameAr, price, originalPrice, quantity, note: notes[id] || '', image: item?.image || '' }; }); return { formattedItems, totalAmount }; };
  const currentOrder = customerUid && currentTable ? orders.find(o => o.tableNumber === currentTable && o.customerId === customerUid && o.status !== 'TrackDone') : undefined;
  const handleCheckout = async () => { if (!Object.keys(cart).length) return; const { formattedItems, totalAmount } = prepareOrderPayloadData(); if (currentOrder) { await appendToOrder(currentOrder.id, formattedItems); setIsOrderPlaced(true); clearCart(); return; } if (currentTable && currentTable !== '0') { await placeOrder(formattedItems, currentTable, null, totalAmount, { appliedDiscountPercent: activeDiscount, restaurantId }); setIsOrderPlaced(true); clearCart(); } else setShowDeliveryForm(true); };
  const handleFinalSubmit = async (deliveryInfo: { name: string; address: string; phone: string }) => { const { formattedItems, totalAmount } = prepareOrderPayloadData(); await placeOrder(formattedItems, '0', deliveryInfo, totalAmount, { appliedDiscountPercent: activeDiscount, restaurantId }); setIsOrderPlaced(true); setShowDeliveryForm(false); clearCart(); };
  const filteredItems = activeCategory === 'all' ? menuItems : menuItems.filter(item => String(item.category || '').trim().toLowerCase() === String(activeCategory).trim().toLowerCase());
  if (!hasStarted) return <TableEntry lang={lang} setLang={setLang} onStart={() => setHasStarted(true)} />;
  const effectivePrimaryColor = theme.primaryColor || themeColor;
  return <div className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative" dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ backgroundColor: theme.menuBgColor || '#0f172a', backgroundImage: theme.menuBgType === 'image' && theme.menuBgImage ? `url('${theme.menuBgImage}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed' }}><div className="relative z-10"><MenuHeader currentTable={currentTable} lang={lang} themeColor={effectivePrimaryColor} logoUrl={theme.logoUrl} bannerUrl={theme.menuBannerUrl} t={t} onOpenReceipts={() => setShowReceipts(true)} />{showReceipts ? <MyReceipts lang={lang} activeOrderId={currentOrder?.id} onBack={() => setShowReceipts(false)} /> : <main className="max-w-md mx-auto px-4 mt-4">{activeDiscount > 0 && !currentOrder && <div className="mb-4 bg-emerald-500 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between"><div className="flex items-center gap-2.5"><Tag className="w-5 h-5" /><div><h4 className="font-bold text-sm">تهانينا! لديك خصم مفعّل 🎉</h4><p className="text-xs text-emerald-100">تم تطبيق تخفيض {activeDiscount}% على جميع الوجبات!</p></div></div><span className="bg-white text-emerald-600 font-extrabold text-xs px-2.5 py-1 rounded-xl">-{activeDiscount}%</span></div>}<div className="mb-6 text-center"><h2 className="text-xl font-bold">{t('appName')}</h2><p className="text-sm text-slate-600 dark:text-slate-400">{t('welcomeMessage')}</p></div><div className="mb-6"><AIChat lang={lang} menuItems={menuItems} t={t} themeColor={effectivePrimaryColor} /></div><MenuOrOrderManager showDeliveryForm={showDeliveryForm} isOrderPlaced={isOrderPlaced} currentOrder={currentOrder ?? null} onDeliveryConfirm={(name, address, phone) => handleFinalSubmit({ name, address, phone })} t={t} themeColor={effectivePrimaryColor} /><CategoryTabs items={menuItems} activeCategory={activeCategory} setActiveCategory={setActiveCategory} themeColor={effectivePrimaryColor} t={t} /><MenuGrid items={filteredItems} cart={cart} notes={notes} onAddToCart={handleAddToCart} onNoteChange={updateNote} themeColor={effectivePrimaryColor} lang={lang} t={t} activeDiscount={activeDiscount} /><CheckoutBar cartCount={cartCount} handleCheckout={handleCheckout} themeColor={effectivePrimaryColor} hasActiveOrder={!!currentOrder} t={t} activeDiscount={activeDiscount} /></main>}</div></div>;
};
