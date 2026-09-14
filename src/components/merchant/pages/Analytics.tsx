import React, { useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../../firebase';
import { getAdminMemberships, getAuthzClaims } from '../../../services/authClaims';
import { BarChart3, CalendarDays, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Language = 'ar' | 'fr' | 'en';
type Granularity = 'day' | 'month' | 'hour';

type AnalyticsResult = {
  ok: boolean;
  contract: { timezone: string; currency: string };
  range: { startDate: string; endDate: string };
  revenue: number;
  expenses: number;
  netProfit: number;
  completedOrders: number;
  excludedOrders: number;
  cancelledOrders: number;
  invalidOrders: number;
  salesByDay: Record<string, number>;
  salesByHour: Record<string, number>;
  categoryShare: Record<string, number>;
  itemShare: Record<string, number>;
  source: string;
};

type RestaurantOption = { id: string; name: string };

const copy = {
  ar: { title: 'التحليلات والأعمال', subtitle: 'لوحة ذكاء الأعمال المبنية على بيانات الخادم', revenue: 'الإيرادات', expenses: 'المصاريف', profit: 'صافي الربح', orders: 'الطلبات المكتملة', range: 'الفترة', from: 'من', to: 'إلى', granularity: 'الدقة', day: 'يومي', month: 'شهري', hour: 'حسب الساعة', category: 'الفئة', item: 'الصنف', all: 'الكل', trend: 'المبيعات عبر الزمن', categories: 'حصة الفئات', items: 'حصة الأصناف', peakHour: 'ساعة الذروة', peakDay: 'يوم الذروة', comparison: 'مقارنة بالفترة السابقة', loading: 'جاري تحميل التحليلات...', empty: 'لا توجد بيانات ضمن هذه الفترة.', error: 'تعذر تحميل التحليلات. تحقق من الصلاحية والإعدادات ثم حاول مجدداً.', retry: 'إعادة المحاولة', restaurant: 'المطعم', noRestaurant: 'لا يوجد مطعم متاح للتحليل.', server: 'حساب خادمي موثوق', currency: 'العملة', timezone: 'المنطقة الزمنية' },
  fr: { title: 'Analytique & Business Intelligence', subtitle: 'Tableau de bord basé sur les données serveur', revenue: 'Revenus', expenses: 'Dépenses', profit: 'Bénéfice net', orders: 'Commandes terminées', range: 'Période', from: 'Du', to: 'Au', granularity: 'Granularité', day: 'Jour', month: 'Mois', hour: 'Par heure', category: 'Catégorie', item: 'Article', all: 'Tous', trend: 'Ventes dans le temps', categories: 'Part des catégories', items: 'Part des articles', peakHour: 'Heure de pointe', peakDay: 'Jour de pointe', comparison: 'Comparaison avec la période précédente', loading: 'Chargement des analyses...', empty: 'Aucune donnée pour cette période.', error: 'Impossible de charger les analyses. Vérifiez les droits et la configuration.', retry: 'Réessayer', restaurant: 'Restaurant', noRestaurant: 'Aucun restaurant disponible.', server: 'Calcul serveur fiable', currency: 'Devise', timezone: 'Fuseau horaire' },
  en: { title: 'Analytics & Business Intelligence', subtitle: 'Server-authoritative business intelligence dashboard', revenue: 'Revenue', expenses: 'Expenses', profit: 'Net profit', orders: 'Completed orders', range: 'Date range', from: 'From', to: 'To', granularity: 'Granularity', day: 'Day', month: 'Month', hour: 'By hour', category: 'Category', item: 'Item', all: 'All', trend: 'Sales over time', categories: 'Category share', items: 'Item share', peakHour: 'Peak hour', peakDay: 'Peak day', comparison: 'Comparison with previous period', loading: 'Loading analytics...', empty: 'No data in this range.', error: 'Analytics could not be loaded. Check access and configuration, then retry.', retry: 'Retry', restaurant: 'Restaurant', noRestaurant: 'No restaurant is available.', server: 'Trusted server calculation', currency: 'Currency', timezone: 'Timezone' },
} as const;

const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const shiftDays = (date: string, days: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return formatDate(d); };
const initialRange = () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 6); return { start: formatDate(start), end: formatDate(end) }; };
const money = (value: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

export const Analytics: React.FC<{ lang?: Language; setLang?: React.Dispatch<React.SetStateAction<Language>> }> = ({ lang = 'en' }) => {
  const t = copy[lang];
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [range, setRange] = useState(initialRange);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [category, setCategory] = useState('');
  const [item, setItem] = useState('');
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [comparison, setComparison] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadRestaurants = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const claims = await getAuthzClaims(user);
        if (!claims) return;
        if (claims.role === 'SuperAdmin') {
          const { collection, getDocs } = await import('firebase/firestore');
          const { db } = await import('../../../firebase');
          const snapshot = await getDocs(collection(db, 'restaurants'));
          if (!cancelled) setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, name: String(doc.data().name || doc.id) })));
        } else if (claims.role === 'Admin') {
          const memberships = await getAdminMemberships();
          if (!cancelled) setRestaurants(memberships.map(m => ({ id: m.restaurantId, name: m.restaurantName || m.restaurantId })));
        } else if (claims.restaurantId && !cancelled) {
          setRestaurants([{ id: claims.restaurantId, name: claims.restaurantId }]);
        }
      } catch (e) { console.error('Failed to load analytics restaurant options', e); }
    };
    void loadRestaurants();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (!restaurantId && restaurants[0]) setRestaurantId(restaurants[0].id); }, [restaurants, restaurantId]);

  const load = async () => {
    if (!restaurantId) { setError(t.noRestaurant); return; }
    setLoading(true); setError('');
    try {
      const callable = httpsCallable(functions, 'getAnalyticsSummary');
      const result = await callable({ restaurantId, startDate: range.start, endDate: range.end });
      const current = result.data as AnalyticsResult;
      const days = Math.max(1, Math.round((new Date(`${range.end}T12:00:00Z`).getTime() - new Date(`${range.start}T12:00:00Z`).getTime()) / 86400000) + 1);
      const previousEnd = shiftDays(range.start, -1);
      const previousStart = shiftDays(previousEnd, -(days - 1));
      const previousResult = await callable({ restaurantId, startDate: previousStart, endDate: previousEnd });
      if (current.ok) setData(current);
      if ((previousResult.data as AnalyticsResult).ok) setComparison(previousResult.data as AnalyticsResult);
    } catch (e) { console.error('Analytics load failed', e); setData(null); setComparison(null); setError(t.error); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (restaurantId) void load(); }, [restaurantId]);

  const trend = useMemo(() => {
    if (!data) return [] as Array<{ label: string; value: number }>;
    if (granularity === 'hour') return Object.entries(data.salesByHour).sort(([a], [b]) => Number(a) - Number(b)).map(([label, value]) => ({ label: `${label}:00`, value }));
    const daily = Object.entries(data.salesByDay).sort(([a], [b]) => a.localeCompare(b));
    if (granularity === 'day') return daily.map(([label, value]) => ({ label, value }));
    const monthly: Record<string, number> = {};
    daily.forEach(([label, value]) => { const key = label.slice(0, 7); monthly[key] = (monthly[key] || 0) + value; });
    return Object.entries(monthly).map(([label, value]) => ({ label, value }));
  }, [data, granularity]);

  const categoryData = useMemo(() => Object.entries(data?.categoryShare || {}).filter(([key]) => !category || key === category).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value })), [data, category]);
  const itemData = useMemo(() => Object.entries(data?.itemShare || {}).filter(([key]) => !item || key === item).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value })), [data, item]);
  const categories = Object.keys(data?.categoryShare || {}).sort();
  const items = Object.keys(data?.itemShare || {}).sort();
  const peakHour = useMemo(() => Object.entries(data?.salesByHour || {}).sort((a, b) => b[1] - a[1])[0], [data]);
  const peakDay = useMemo(() => Object.entries(data?.salesByDay || {}).sort((a, b) => b[1] - a[1])[0], [data]);
  const comparisonDelta = comparison && data ? data.revenue - comparison.revenue : 0;
  const comparisonPct = comparison && comparison.revenue !== 0 ? (comparisonDelta / comparison.revenue) * 100 : null;

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><h1 className="text-2xl font-extrabold text-slate-800">{t.title}</h1><p className="text-sm text-slate-500 mt-1">{t.subtitle}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label={t.restaurant} value={restaurantId} onChange={e => setRestaurantId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
            {restaurants.length ? restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>) : <option value="">{t.noRestaurant}</option>}
          </select>
          <button onClick={() => void load()} disabled={loading || !restaurantId} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t.retry}</button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-semibold text-slate-600">{t.from}<input type="date" value={range.start} max={range.end} onChange={e => setRange(r => ({ ...r, start: e.target.value }))} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2" /></label>
          <label className="text-sm font-semibold text-slate-600">{t.to}<input type="date" value={range.end} min={range.start} onChange={e => setRange(r => ({ ...r, end: e.target.value }))} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2" /></label>
          <label className="text-sm font-semibold text-slate-600">{t.granularity}<select value={granularity} onChange={e => setGranularity(e.target.value as Granularity)} className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="day">{t.day}</option><option value="month">{t.month}</option><option value="hour">{t.hour}</option></select></label>
          <label className="text-sm font-semibold text-slate-600">{t.category}<select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block max-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="">{t.all}</option>{categories.map(v => <option key={v}>{v}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-600">{t.item}<select value={item} onChange={e => setItem(e.target.value)} className="mt-1 block max-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="">{t.all}</option>{items.map(v => <option key={v}>{v}</option>)}</select></label>
          <button onClick={() => void load()} disabled={loading || !restaurantId} className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-bold disabled:opacity-50"><CalendarDays size={16} className="inline me-2" />{t.range}</button>
        </div>
      </section>

      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">{t.loading}</div>}
      {error && !loading && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 flex items-center justify-between gap-4"><span>{error}</span><button onClick={() => void load()} className="rounded-lg bg-white px-3 py-2 font-bold">{t.retry}</button></div>}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[{ label: t.revenue, value: money(data.revenue, data.contract.currency), icon: TrendingUp }, { label: t.expenses, value: money(data.expenses, data.contract.currency), icon: TrendingDown }, { label: t.profit, value: money(data.netProfit, data.contract.currency), icon: BarChart3 }, { label: t.orders, value: data.completedOrders.toLocaleString(), icon: CalendarDays }].map(card => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-400">{card.label}</p><p className="mt-2 text-2xl font-extrabold text-slate-800">{card.value}</p></div><card.icon className="text-amber-500" /></div></div>)}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-slate-800">{t.trend}</h2><div className="h-72">{trend.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(v: number | undefined) => money(v || 0, data.contract.currency)} /><Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} className="text-amber-500" dot={false} /></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-slate-400">{t.empty}</div>}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-slate-800">{t.categories}</h2><div className="h-72">{categoryData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={90} /><Tooltip formatter={(v: number | undefined) => money(v || 0, data.contract.currency)} /><Bar dataKey="value" fill="currentColor" className="text-amber-500" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-slate-400">{t.empty}</div>}</div></div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-slate-800">{t.items}</h2><div className="space-y-2">{itemData.length ? itemData.map(row => <div key={row.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="truncate font-semibold">{row.name}</span><span className="font-bold">{money(row.value, data.contract.currency)}</span></div>) : <p className="text-slate-400">{t.empty}</p>}</div></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-400">{t.peakHour}</p><p className="mt-2 text-2xl font-extrabold">{peakHour ? `${peakHour[0]}:00` : '—'}</p>{peakHour && <p className="text-sm text-slate-500">{money(peakHour[1], data.contract.currency)}</p>}</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-400">{t.peakDay}</p><p className="mt-2 text-lg font-extrabold">{peakDay?.[0] || '—'}</p>{peakDay && <p className="text-sm text-slate-500">{money(peakDay[1], data.contract.currency)}</p>}</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2"><p className="text-xs font-bold text-slate-400">{t.comparison}</p><p className={`mt-2 text-2xl font-extrabold ${comparisonDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{comparisonPct === null ? '—' : `${comparisonPct >= 0 ? '+' : ''}${comparisonPct.toFixed(1)}%`}</p></div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-500"><span>{t.server}</span><span>{t.currency}: {data.contract.currency}</span><span>{t.timezone}: {data.contract.timezone}</span></div>
        </>
      )}
      {!loading && !error && data && data.completedOrders === 0 && data.expenses === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">{t.empty}</div>}
    </div>
  );
};
