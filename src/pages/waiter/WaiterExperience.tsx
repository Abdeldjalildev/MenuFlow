import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { signOut } from 'firebase/auth';
import { LogOut, ShoppingCart } from 'lucide-react';
import { auth, db, functions } from '../../firebase';
import { getAuthzClaims } from '../../services/authClaims';
import type { MenuItem } from '../../context/MenuContext';
import { MenuGrid } from '../../components/customer/MenuGrid';
import { CategoryTabs } from '../../components/customer/CategoryTabs';

type Lang = 'ar' | 'en' | 'fr';
const text: Record<Lang, Record<string, string>> = {
  ar: { title: 'واجهة النادل', subtitle: 'إنشاء طلب للطاولة', table: 'رقم الطاولة', placeholder: 'مثال: 12', cart: 'السلة', empty: 'السلة فارغة', submit: 'إرسال الطلب للمطبخ', submitting: 'جاري الإرسال...', success: 'تم إنشاء الطلب بنجاح', order: 'رقم الطلب', error: 'تعذر تحميل البيانات', auth: 'جلسة النادل غير صالحة', noMenu: 'لا توجد عناصر متاحة في القائمة', logout: 'تسجيل الخروج', addToCart: 'إضافة', specialNote: 'ملاحظة خاصة', currency: 'دج' },
  en: { title: 'Waiter', subtitle: 'Create an order for a table', table: 'Table number', placeholder: 'e.g. 12', cart: 'Cart', empty: 'Cart is empty', submit: 'Send order to kitchen', submitting: 'Submitting...', success: 'Order created successfully', order: 'Order number', error: 'Unable to load data', auth: 'Invalid waiter session', noMenu: 'No available menu items', logout: 'Sign out', addToCart: 'Add', specialNote: 'Special note', currency: 'DZD' },
  fr: { title: 'Serveur', subtitle: 'Créer une commande pour une table', table: 'Numéro de table', placeholder: 'ex. 12', cart: 'Panier', empty: 'Panier vide', submit: 'Envoyer en cuisine', submitting: 'Envoi...', success: 'Commande créée avec succès', order: 'Numéro de commande', error: 'Impossible de charger les données', auth: 'Session serveur invalide', noMenu: 'Aucun article disponible', logout: 'Se déconnecter', addToCart: 'Ajouter', specialNote: 'Note spéciale', currency: 'DZD' },
};

export const WaiterExperience: React.FC = () => {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('preferred_lang');
    return saved === 'ar' || saved === 'fr' || saved === 'en' ? saved : 'en';
  });
  const t = text[lang];
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [themeColor, setThemeColor] = useState('#4f46e5');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tableNumber, setTableNumber] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const user = auth.currentUser;
        const claims = user ? await getAuthzClaims(user) : null;
        if (!claims || claims.role !== 'Waiter' || typeof claims.restaurantId !== 'string' || !claims.restaurantId.trim()) throw new Error(t.auth);
        if (active) setRestaurantId(claims.restaurantId);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : t.auth); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [t.auth]);

  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    const q = query(collection(db, 'restaurants', restaurantId, 'menuItems'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snap => {
      if (active) setMenuItems(snap.docs.map(item => ({ id: item.id, ...item.data() })) as MenuItem[]);
    }, () => { if (active) setError(t.error); });
    void getDoc(doc(db, 'restaurants', restaurantId, 'settings', 'theme')).then(snap => {
      if (active && snap.exists() && typeof snap.data().primaryColor === 'string') setThemeColor(snap.data().primaryColor);
    }).catch(() => undefined);
    return () => { active = false; unsubscribe(); };
  }, [restaurantId, t.error]);

  const filteredItems = useMemo(() => category === 'all' ? menuItems : menuItems.filter(item => String(item.category || '').trim().toLowerCase() === category.trim().toLowerCase()), [category, menuItems]);
  const count = Object.values(cart).reduce((sum, value) => sum + value, 0);
  const add = (id: string) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const note = (id: string, value: string) => setNotes(prev => ({ ...prev, [id]: value.slice(0, 500) }));

  const submit = async () => {
    if (!restaurantId || !tableNumber.trim() || count === 0 || submitting) return;
    setSubmitting(true); setError(''); setSuccess(null);
    try {
      const items = Object.entries(cart).map(([menuItemId, quantity]) => ({ menuItemId, quantity, note: notes[menuItemId] || '' }));
      const createOrder = httpsCallable(functions, 'createOrder');
      const result = await createOrder({ restaurantId, tableNumber: tableNumber.trim(), orderSource: 'waiter', items });
      const data = result.data as { orderNumber?: number };
      if (typeof data.orderNumber !== 'number') throw new Error(t.error);
      setSuccess(data.orderNumber); setCart({}); setNotes({}); setTableNumber('');
    } catch (e) { setError(e instanceof Error ? e.message : t.error); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!restaurantId) return <div className="min-h-screen flex items-center justify-center p-6 text-center text-red-600">{error || t.auth}</div>;

  const tr = (key: string) => t[key] || key;
  return <div className="min-h-screen bg-slate-50 text-slate-900" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200"><div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3"><div><h1 className="font-bold">{t.title}</h1><p className="text-xs text-slate-500">{t.subtitle}</p></div><div className="flex items-center gap-2"><select aria-label="Language" value={lang} onChange={e => { const value = e.target.value as Lang; setLang(value); localStorage.setItem('preferred_lang', value); }} className="text-xs border rounded-lg px-2 py-1.5 bg-white"><option value="ar">العربية</option><option value="en">English</option><option value="fr">Français</option></select><button onClick={() => void signOut(auth)} className="p-2 rounded-lg border" aria-label={t.logout}><LogOut size={16} /></button></div></div></header>
    <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
      <section className="bg-white rounded-2xl border p-4"><label htmlFor="waiter-table" className="block text-sm font-bold mb-2">{t.table}</label><input id="waiter-table" value={tableNumber} onChange={e => setTableNumber(e.target.value.slice(0, 32))} placeholder={t.placeholder} className="w-full border rounded-xl px-3 py-2.5" dir="ltr" /></section>
      {error && <div role="alert" className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{error}</div>}
      {success !== null && <div role="status" className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-4 text-sm"><strong>{t.success}</strong><div className="mt-1">{t.order}: <strong>{success}</strong></div></div>}
      <section><CategoryTabs items={menuItems} activeCategory={category} setActiveCategory={setCategory} themeColor={themeColor} t={tr} />{filteredItems.length ? <MenuGrid items={filteredItems} cart={cart} notes={notes} onAddToCart={add} onNoteChange={note} themeColor={themeColor} lang={lang} t={tr} /> : <div className="text-center py-12 text-slate-500">{t.noMenu}</div>}</section>
      <section className="sticky bottom-4 bg-white rounded-2xl border shadow-lg p-4"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2 font-bold"><ShoppingCart size={18} /> {t.cart}: {count}</div><button disabled={!tableNumber.trim() || count === 0 || submitting} onClick={() => void submit()} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-40">{submitting ? t.submitting : t.submit}</button></div>{count === 0 && <p className="text-xs text-slate-500 mt-2">{t.empty}</p>}</section>
    </main>
  </div>;
};
