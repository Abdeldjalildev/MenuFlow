import React, { useState, useEffect, useContext } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { OrderContext } from '../../../context/OrderProvider';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, DollarSign, Trash2, Receipt, ArrowUpRight, Star, MapPin, Users } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface ReportsProps {
  lang?: Language;
}

export const Reports: React.FC<ReportsProps> = (props) => {
  // استقبال حالة اللغة الموحدة من الراوتر الأب أو البروبس
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';
  const t = translations[lang].reports;

  const context = useContext(OrderContext);
  const orders = context?.orders || [];

  const [totalExpenses, setTotalExpenses] = useState<number | null>(null);
  const [totalWaste, setTotalWaste] = useState<number | null>(null);
  
  // حالات التقييمات الجديدة
  const [averageRating, setAverageRating] = useState<number>(0);
  const [positiveCount, setPositiveCount] = useState<number>(0);
  const [totalFeedbacks, setTotalFeedbacks] = useState<number>(0);
  
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // رابط جوجل ماب الخاص بالمطعم
  const googleMapsLink = "https://maps.google.com"; 

  // 1. جلب المصاريف الخاصة بالمطعم الحالي
  useEffect(() => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      setTotalExpenses(0);
      return;
    }

    const qExpenses = query(collection(db, 'expenses'), where('restaurantId', '==', restaurantId));
    const unsubscribe = onSnapshot(qExpenses, (snapshot) => {
      const total = snapshot.docs.reduce((sum, docSnap) => sum + Number(docSnap.data().amount || 0), 0);
      setTotalExpenses(total);
    });
    return () => unsubscribe();
  }, []);

  // 2. جلب الهدر الخاص بالمطعم الحالي
  useEffect(() => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      setTotalWaste(0);
      return;
    }

    const qWaste = query(collection(db, 'waste_log'), where('restaurantId', '==', restaurantId));
    const unsubscribe = onSnapshot(qWaste, (snapshot) => {
      const total = snapshot.docs.reduce((sum, docSnap) => sum + Number(docSnap.data().estimatedLoss || 0), 0);
      setTotalWaste(total);
    });
    return () => unsubscribe();
  }, []);

  // 3. جلب وحساب تقييمات الزبائن حياً للمطعم الحالي
  useEffect(() => {
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      setAverageRating(0);
      setPositiveCount(0);
      setTotalFeedbacks(0);
      return;
    }

    const qReviews = query(collection(db, 'reviews'), where('restaurantId', '==', restaurantId));
    const unsubscribe = onSnapshot(qReviews, (snapshot) => {
      const docs = snapshot.docs.map(docSnap => docSnap.data());
      const total = docs.length;
      
      if (total > 0) {
        const sumStars = docs.reduce((sum, d) => sum + Number(d.rating || 0), 0);
        const avg = Number((sumStars / total).toFixed(1));
        const positive = docs.filter((d: any) => Number(d.rating) >= 4).length;
        
        setAverageRating(avg);
        setPositiveCount(positive);
        setTotalFeedbacks(total);
      } else {
        setAverageRating(0);
        setPositiveCount(0);
        setTotalFeedbacks(0);
      }
    });
    return () => unsubscribe();
  }, []);

  // 4. مراقبة اكتمال وصول البيانات
  useEffect(() => {
    if (totalExpenses !== null && totalWaste !== null) {
      const timer = setTimeout(() => {
        setIsDataLoaded(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [totalExpenses, totalWaste, orders]);
   if (!isDataLoaded) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-slate-500" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium animate-pulse">{t.loadingText}</p>
      </div>
    );
  }

  // 5. حساب الإيرادات بشكل محمي 
  const totalRevenue = orders
    .filter((order: any) => 
      order?.status === 'paid' || 
      order?.status === 'completed' || 
      order?.status === 'ready_for_payment' || 
      order?.status === 'delivered_unpaid'
    )
    .reduce((sum: number, order: any) => {
      if (!order?.items || !Array.isArray(order.items)) return sum;

      const orderTotal = order.items.reduce((orderSum: number, item: any) => {
        const price = Number(item?.menuItem?.price || item?.price || 0);
        return orderSum + (price * (item?.quantity || 1));
      }, 0);
      return sum + orderTotal;
    }, 0);

  const finalExpenses = totalExpenses || 0;
  const finalWaste = totalWaste || 0;
  const netProfit = totalRevenue - (finalExpenses + finalWaste);

  const chartData = [
    { name: t.chartWeeks.week1, [t.chartRevenue]: totalRevenue * 0.2, [t.chartExpenses]: finalExpenses * 0.25 },
    { name: t.chartWeeks.week2, [t.chartRevenue]: totalRevenue * 0.25, [t.chartExpenses]: finalExpenses * 0.2 },
    { name: t.chartWeeks.week3, [t.chartRevenue]: totalRevenue * 0.22, [t.chartExpenses]: finalExpenses * 0.3 },
    { name: t.chartWeeks.week4, [t.chartRevenue]: totalRevenue * 0.33, [t.chartExpenses]: finalExpenses * 0.25 },
  ];

  return (
    <div className="space-y-6 animate-fadeIn" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
        <p className="text-sm text-slate-500">{t.subtitle}</p>
      </div>

      {/* الكروت المالية الأربعة الأولى */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold">{t.totalSales}</p>
            <p className="text-xl font-extrabold text-slate-800 mt-1">{totalRevenue.toLocaleString()} {t.currency}</p>
            <span className="text-[10px] text-green-600 flex items-center gap-0.5 mt-1">
              <ArrowUpRight size={12} /> {t.liveUpdate}
            </span>
          </div>
          <span className="p-3 bg-green-50 text-green-500 rounded-xl"><DollarSign size={20} /></span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold">{t.totalExpenses}</p>
            <p className="text-xl font-extrabold text-red-600 mt-1">{finalExpenses.toLocaleString()} {t.currency}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">{t.costRecords}</span>
          </div>
          <span className="p-3 bg-red-50 text-red-500 rounded-xl"><Receipt size={20} /></span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold">{t.totalWaste}</p>
            <p className="text-xl font-extrabold text-orange-600 mt-1">{finalWaste.toLocaleString()} {t.currency}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">{t.kitchenAndStock}</span>
          </div>
          <span className="p-3 bg-orange-50 text-orange-500 rounded-xl"><Trash2 size={20} /></span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold">{t.netProfit}</p>
            <p className={`text-xl font-extrabold mt-1 ${netProfit >= 0 ? 'text-indigo-600' : 'text-red-700'}`}>
              {netProfit.toLocaleString()} {t.currency}
            </p>
            <span className="text-[10px] text-slate-400 mt-1 block">{t.realProfit}</span>
          </div>
          <span className={`p-3 rounded-xl ${netProfit >= 0 ? 'bg-indigo-50 text-indigo-500' : 'bg-red-100 text-red-600'}`}><TrendingUp size={20} /></span>
        </div>
      </div>

      {/* 🌟 كروت مؤشرات التقييم والتصدر على الخرائط */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* كارت معدل النجوم الحقيقي */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold">{t.localRating}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-extrabold text-slate-800">{averageRating || "0.0"}</p>
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.round(averageRating) ? "currentColor" : "none"} />
                ))}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {t.totalReviewsHint.replace('{count}', totalFeedbacks.toString())}
            </span>
          </div>
          <span className="p-3 bg-amber-50 text-amber-500 rounded-xl"><Star size={20} fill="currentColor" /></span>
        </div>

        {/* كارت التقييمات الإيجابية وسر الصدارة */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold">{t.positiveReviews}</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {positiveCount} <span className="text-xs font-normal text-slate-500">{t.happyCustomersHint}</span>
            </p>
            <span className="text-[10px] text-emerald-600 mt-1 block font-medium">{t.reputationGrowth}</span>
          </div>
          <span className="p-3 bg-emerald-50 text-emerald-500 rounded-xl"><Users size={20} /></span>
        </div>

        {/* كارت الربط والتوجيه لجوجل ماب للمنافسة في الولاية */}
        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-xs text-slate-400 font-bold">{t.googleMapsTitle}</p>
              <p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-1">
                <MapPin size={16} className="text-blue-500 shrink-0" /> Google My Business
              </p>
            </div>
            <span className="p-2.5 bg-blue-50 text-blue-500 rounded-xl"><MapPin size={18} /></span>
          </div>
          <a 
            href={googleMapsLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-3 text-center text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl transition-all duration-200 block shadow-sm"
          >
            {t.googleMapsBtn}
          </a>
        </div>

      </div>

      {/* الرسم البياني لـ الإيرادات والمصاريف */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 text-base mb-6">{t.chartTitle}</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
                <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey={t.chartRevenue} stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2.5} />
              <Area type="monotone" dataKey={t.chartExpenses} stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};