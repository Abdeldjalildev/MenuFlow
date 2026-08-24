import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { DigitalReceipt } from '../Receipt/DigitalReceipt';
import { myReceiptsTranslations } from '../../utils/translations/myReceiptsTranslations';

type Language = 'ar' | 'fr' | 'en';

interface MyReceiptsProps {
  lang?: Language;
  activeOrderId?: string;
  customerPhone?: string;
  onBack?: () => void;
}

// 🎯 دالة آمنة لجلب معرّف الزبون الخاص بالمتصفح/الهاتف
const getCustomerId = (): string => {
  return localStorage.getItem('menu_customer_id') || '';
};

export const MyReceipts: React.FC<MyReceiptsProps> = ({
  lang = 'ar',
  activeOrderId,
  customerPhone,
  onBack,
}) => {
  const [paidOrders, setPaidOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();

  // جلب معرف المطعم الحالي لضمان العزل التام
  const getRestaurantId = () => {
    return searchParams.get('restaurantId') || localStorage.getItem('restaurantId') || 'default_restaurant';
  };

  const currentRestaurantId = getRestaurantId();

  // استدعاء الترجمات بحسب اللغة الحالية مع حماية Fallback
  const t = myReceiptsTranslations[lang] || myReceiptsTranslations.ar || myReceiptsTranslations['ar'];

  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const localCustomerId = getCustomerId();
    
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const ordersList: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // 🎯 0️⃣ التحقق الصارم من عزل المطعم (يجب أن تتطابق تماماً، وتستبعد الطلبات القديمة التي لا تحتوي على restaurantId)
        if (!data.restaurantId || data.restaurantId !== currentRestaurantId) {
          return;
        }

        // 1️⃣ الفاتورة يجب أن تكون مدفوعة أو مكتملة أو حالتها paid
        const isPaidOrder = data.isPaid === true || data.status === 'completed' || data.status === 'paid' || data.status === 'delivered_unpaid';

        if (isPaidOrder) {
          // 2️⃣ الشرط الدقيق والآمن لعزل الزبائن عن بعضهم:
          const isMyReceipt = 
            (localCustomerId && data.customerId === localCustomerId) || 
            (activeOrderId && doc.id === activeOrderId) || 
            (customerPhone && (data.customerPhone === customerPhone || data.deliveryData?.phone === customerPhone));

          if (isMyReceipt) {
            ordersList.push({
              id: doc.id,
              ...data,
            });
          }
        }
      });

      // ✅ الترتيب الصحيح من الأحدث إلى الأقدم (Newest First)
      ordersList.sort((a, b) => {
        const getTime = (order: any) => {
          const rawTime = order.receiptGeneratedAt || order.createdAt;
          if (!rawTime) return 0;
          
          if (typeof rawTime.toDate === 'function') {
            return rawTime.toDate().getTime();
          }
          if (rawTime.seconds) {
            return rawTime.seconds * 1000;
          }
          return new Date(rawTime).getTime() || 0;
        };

        return getTime(b) - getTime(a);
      });

      setPaidOrders(ordersList);
      setLoading(false);
    }, (error) => {
      console.error("خطأ في جلب الفواتير الرقمية:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeOrderId, customerPhone, currentRestaurantId]);

  const filteredOrders = paidOrders.filter((order) =>
    order.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto space-y-6">
          {/* شريط العنوان والتنقل */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-black text-white">{t?.title || 'فواتيري الرقمية'}</h1>
            <p className="text-xs text-slate-400 mt-1">{t?.subtitle || 'سجل جميع طلباتك المدفوعة'}</p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl border border-slate-700 transition-all active:scale-95 cursor-pointer"
            >
              {t?.backBtn || 'العودة للمنيو'}
            </button>
          )}
        </div>

        {/* حقل البحث وإحصاء الفواتير */}
        {paidOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t?.searchPlaceholder || 'بحث برقم المرجع...'}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-700/50">
              {t?.totalCount || 'مجموع الفواتير:'} <strong className="text-emerald-400">{filteredOrders.length}</strong>
            </span>
          </div>
        )}

        {/* قائمة عرض الفواتير الرقمية */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm animate-pulse">
            {t?.loadingText || 'جاري تحميل فواتيرك...'}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/40 rounded-3xl border border-dashed border-slate-800 p-8 space-y-3">
            <span className="text-5xl block">🧾</span>
            <h3 className="text-base font-bold text-slate-300">{t?.noReceipts || 'لا توجد فواتير سابقة'}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">{t?.noReceiptsSub || 'عند قيامك بطلب وجبة وإتمام دفعها ستظهر فاتورتك هنا فوراً.'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <DigitalReceipt
                key={order.id}
                order={order}
                lang={lang}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};