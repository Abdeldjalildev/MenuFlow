import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot, updateDoc, doc, deleteDoc, where, query } from 'firebase/firestore';
import { Trash2, CheckCircle2, User, Phone, Star, ThumbsUp, AlertOctagon } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { translations } from '../../../utils/translations/merchantTranslations';

type Language = 'ar' | 'fr' | 'en';

interface ComplaintsProps {
  lang?: Language;
}

// تغيير الاسم برمجياً ليعبر عن الآراء والشكاوى
interface Feedback {
  id: string;
  customerName: string;
  customerPhone: string;
  tableNumber: string;
  message: string;
  status: 'pending' | 'resolved';
  date: string;
  rating?: number; // التقييم بالنجوم (1 إلى 5)
  type?: 'review' | 'complaint'; // اختياري في حال تم تحديده صراحة
  createdAtRaw?: number;
}

export const Complaints: React.FC<ComplaintsProps> = (props) => {

  // 🏢 معرف المطعم الحالي
  const restaurantId = localStorage.getItem('restaurantId') || 'default_restaurant';
  
  // استقبال اللغة الموحدة من الراوتر الأب أو البروبس
  const outletContext = useOutletContext<{ lang: Language }>() || {};
  const lang = props.lang || outletContext.lang || 'ar';

  const t = translations[lang].complaints;
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  
  // حالة الفلترة: 'all' | 'reviews' | 'complaints'
  const [activeFilter, setActiveFilter] = useState<'all' | 'reviews' | 'complaints'>('all');

  // جلب الآراء والشكاوى حية من الفايربيس
  // جلب الآراء والشكاوى الخاصة بهذا المطعم فقط حية من الفايربيس
  useEffect(() => {
    const localeMap = { ar: 'ar-DZ', fr: 'fr-FR', en: 'en-US' };

    // 🏢 تقييد الاستعلام بمطعمك حصرياً
    const q = query(
      collection(db, 'complaints'), 
      where('restaurantId', '==', restaurantId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => {
        const docData = docSnap.data();
        const dateObj = docData.createdAt?.toDate ? docData.createdAt.toDate() : new Date();
        const createdAtRaw = dateObj.getTime();
        
        return {
          ...docData,
          id: docSnap.id,
          date: dateObj.toLocaleDateString(localeMap[lang] || 'ar-DZ'),
          createdAtRaw,
        } as Feedback;
      });
      // ترتيب زمني (الأحدث أولاً)
      data.sort((a, b) => (b.createdAtRaw || 0) - (a.createdAtRaw || 0));
      setFeedbacks(data);
    });
    return () => unsubscribe();
  }, [lang, restaurantId]);

  // تحديث حالة الشكوى/الرأي إلى "تم الحل / تمت القراءة"
  const handleResolve = async (id: string) => {
    const ref = doc(db, 'complaints', id);
    await updateDoc(ref, { status: 'resolved' });
  };

  // حذف العنصر من السجل
  const handleDelete = async (id: string) => {
    if (window.confirm(t.deleteConfirm || 'هل أنت متأكد من الحذف؟')) {
      await deleteDoc(doc(db, 'complaints', id));
    }
  };

  // دالة الفلترة (التقييم 4 أو 5 يعتبر رأي إيجابي، أقل من ذلك أو بدون نجوم يعتبر شكوى)
  const filteredFeedbacks = feedbacks.filter(item => {
    const isPositive = item.rating && item.rating >= 4;
    if (activeFilter === 'reviews') return isPositive;
    if (activeFilter === 'complaints') return !isPositive;
    return true; // 'all'
  });

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* الهيدر */}
      <div>
        {/* يمكنك إضافة مفاتيح الترجمة الجديدة في ملف translations لاحقاً */}
        <h1 className="text-2xl font-bold text-slate-800">{lang === 'ar' ? 'الآراء والشكاوى' : t.title}</h1>
        <p className="text-sm text-slate-500">{lang === 'ar' ? 'متابعة تقييمات الزبائن وملاحظاتهم' : t.subtitle}</p>
      </div>

      {/* أزرار الفلترة العلوية (Tabs) */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {lang === 'ar' ? 'الكل' : 'All'}
        </button>
        <button
          onClick={() => setActiveFilter('reviews')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeFilter === 'reviews' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ThumbsUp size={16} />
          {lang === 'ar' ? 'الآراء الإيجابية' : 'Positive Reviews'}
        </button>
        <button
          onClick={() => setActiveFilter('complaints')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeFilter === 'complaints' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <AlertOctagon size={16} />
          {lang === 'ar' ? 'الشكاوى والملاحظات' : 'Complaints'}
        </button>
      </div>

      {/* قائمة الآراء والشكاوى */}
      <div className="space-y-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="bg-white p-8 text-center text-slate-400 italic rounded-2xl border border-slate-200 shadow-sm">
            {t.emptyState || 'لا توجد بيانات حالياً'}
          </div>
        ) : (
          filteredFeedbacks.map((item) => {
            // تحديد هل هو إيجابي أم سلبي لتغيير الألوان
            const isPositive = item.rating && item.rating >= 4;
            
            return (
              <div 
                key={item.id} 
                className={`p-5 rounded-2xl border bg-white shadow-sm transition-all duration-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                  lang === 'ar' 
                    ? (isPositive ? 'border-r-4 border-r-green-500' : 'border-r-4 border-r-red-500')
                    : (isPositive ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500')
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
                      <User size={14} className="text-slate-400" />
                      {item.customerName || t.anonymousCustomer || 'زبون غير معروف'}
                    </span>
                    {item.tableNumber && item.tableNumber !== '0' && (
                      <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-md font-semibold">
                        {t.tablePrefix || 'طاولة '}{item.tableNumber}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{item.date}</span>

                    {/* عرض النجوم إن وجدت */}
                    {item.rating && (
                      <div className="flex items-center gap-0.5 bg-slate-50 px-2 py-0.5 rounded-full" dir="ltr">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            className={i < (item.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-300"} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1" dir="ltr">
                      <Phone size={12} />
                      {item.customerPhone || '—'}
                    </span>
                  </div>
                </div>

                {/* أزرار العمليات والحالة */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  {item.status === 'pending' ? (
                    <button
                      onClick={() => handleResolve(item.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                        isPositive 
                        ? 'bg-green-50 text-green-700 hover:bg-green-600 hover:text-white' 
                        : 'bg-red-50 text-red-700 hover:bg-red-600 hover:text-white'
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      <span>{isPositive ? (lang === 'ar' ? 'تمت القراءة' : 'Acknowledged') : (t.resolveButton || 'حل المشكلة')}</span>
                    </button>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold">
                      {isPositive ? (lang === 'ar' ? 'مقروء' : 'Read') : (t.resolvedBadge || 'تم الحل')}
                    </span>
                  )}
                  
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
