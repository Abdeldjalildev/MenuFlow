import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface Props {
  items: any[]; 
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  themeColor: string;
  t: (key: string) => string;
  lang?: string;
}

export const CategoryTabs: React.FC<Props> = ({ items, activeCategory, setActiveCategory, themeColor, t, lang = 'ar' }) => {
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [searchParams] = useSearchParams();

  // دالة جلب معرف المطعم الحالي لضمان العزل
  const getRestaurantId = () => {
    return searchParams.get('restaurantId') || localStorage.getItem('restaurantId') || 'default_restaurant';
  };

  const currentRestaurantId = getRestaurantId();

  // 2. جلب التصنيفات الخاصة بالمطعم الحالي فقط بشكل لحظي من فايربيس
  useEffect(() => {
    const categoriesRef = collection(db, 'categories');
    // إنشاء استعلام مفلتر حسب restaurantId مع دعم التوافقية للمستندات القديمة إن وجدت
    const q = query(categoriesRef, where('restaurantId', '==', currentRestaurantId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCats = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setDbCategories(fetchedCats);
    }, (error) => {
      console.error("Error fetching categories: ", error);
    });

    return () => unsubscribe();
  }, [currentRestaurantId]);

  // 3. دمج التصنيفات الأساسية (الكل) مع تصنيفات المينيو الحالية وتصنيفات فايربيس للمطعم
  const menuCategories = Array.from(new Set(items.map(item => item.category)));
  const dbCategoryIds = dbCategories.map(cat => cat.id);
  
  const allCategoryIds = Array.from(new Set(['all', ...menuCategories, ...dbCategoryIds]));

  // 4. دالة عرض اسم التصنيف باللغة المناسبة
  const getCategoryName = (catId: string) => {
    if (catId === 'all') return t('all');
    
    const foundCat = dbCategories.find(c => c.id === catId);
    if (foundCat) {
      return foundCat[lang] || foundCat.ar || foundCat.en || foundCat.id;
    }

    const translated = t(catId.toLowerCase());
    return translated !== catId.toLowerCase() ? translated : catId.toUpperCase();
  };

  return (
    <div className="w-full flex flex-wrap items-center justify-center gap-2 px-4 py-3">
      {allCategoryIds.map((cat) => (
        <button
          key={cat}
          onClick={() => setActiveCategory(cat)}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            activeCategory === cat 
              ? 'text-white shadow-md scale-105' 
              : 'bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white'
          }`}
          style={activeCategory === cat ? { backgroundColor: themeColor } : {}}
        >
          {getCategoryName(cat)}
        </button>
      ))}
    </div>
  );
};