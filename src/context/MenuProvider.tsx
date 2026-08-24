import React, { useState, useEffect } from 'react';
import { MenuContext } from './MenuContext';
import type { MenuItem } from './MenuContext'; 
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState<string>('#6366f1');

  // 🎯 إدارة معرف المطعم (restaurantId)
  const [restaurantId, setRestaurantId] = useState<string>(() => {
    // يمكن جلبه من الرابط أو التخزين المحلي، أو تعيين مطعم افتراضي مؤقت للتجربة
    const urlParams = new URLSearchParams(window.location.search);
    const restFromUrl = urlParams.get('restaurantId');
    if (restFromUrl) {
      localStorage.setItem('restaurantId', restFromUrl);
      return restFromUrl;
    }
    return localStorage.getItem('restaurantId') || 'default_restaurant';
  });

  // العناصر الثابتة الافتراضية
  const defaultItems: MenuItem[] = [
    {
      id: 'm1',
      name: { ar: 'برجر كلاسيك تفجير', en: 'Classic Beef Burger', fr: 'Burger Bœuf Classique' },
      description: { ar: 'لحم بقري مشوي مع جبنة شيدر سائلة وصلصة سرية', en: 'Grilled beef patty with melted cheddar and secret sauce', fr: 'Steak de bœuf grillé, cheddar fondu et sauce secrète' },
      price: 12.5,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
      category: 'burgers',
      attributes: { isVegetarian: false, isSpicy: false, isGlutenFree: false }
    },
    {
      id: 'm2',
      name: { ar: 'بيتزا مارغريتا إيطالية', en: 'Pizza Margherita', fr: 'Pizza Margherita' },
      description: { ar: 'صلصة طماطم إيطالية مع جبنة موزاريلا طازجة وريحان عطر', en: 'Italian tomato sauce with fresh mozzarella and basil', fr: 'Sauce tomate italienne, mozzarella fraîche et basilic' },
      price: 14.0,
      image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500',
      category: 'pizza',
      attributes: { isVegetarian: true, isSpicy: false, isGlutenFree: false }
    },
    {
      id: 'm3',
      name: { ar: 'بطاطس مقرمشة بالجبن', en: 'Cheesy Fries', fr: 'Frites au Fromage' },
      description: { ar: 'أصابع بطاطس ذهبية مغطاة بصلصة الجبن الغنية وحبيبات الهالابينو', en: 'Golden fries smothered in rich cheese sauce and jalapenos', fr: 'Frites dorées nappées de sauce au fromage et jalapeños' },
      price: 6.0,
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500',
      category: 'appetizers',
      attributes: { isVegetarian: true, isSpicy: true, isGlutenFree: true }
    },
    {
      id: 'm4',
      name: { ar: 'سلطة سيزر بالدجاج', en: 'Chicken Caesar Salad', fr: 'Salade César au Poulet' },
      description: { ar: 'خس مقرمش مع صدور دجاج مشوية، خبز محمص وجبنة بارميزان', en: 'Crispy lettuce with grilled chicken, croutons, and parmesan', fr: 'Laitue croquante, poulet grillé, croûtons et parmesan' },
      price: 9.5,
      image: 'https://images.unsplash.com/photo-1512852939750-13b009e519e6?w=500',
      category: 'salads',
      attributes: { isVegetarian: false, isSpicy: false, isGlutenFree: false }
    },
    {
      id: 'm5',
      name: { ar: 'دجاج مقرمش حار', en: 'Spicy Fried Chicken', fr: 'Poulet Frit Épicé' },
      description: { ar: 'قطع دجاج مقلية بخلطة توابل حارة سرية تقدم مع صوص المايونيز', en: 'Fried chicken pieces with a secret spicy blend, served with mayo', fr: 'Morceaux de poulet frits aux épices secrètes, servis avec mayo' },
      price: 11.0,
      image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500',
      category: 'main',
      attributes: { isVegetarian: false, isSpicy: true, isGlutenFree: false }
    },
    {
      id: 'm6',
      name: { ar: 'تشيز كيك الفراولة', en: 'Strawberry Cheesecake', fr: 'Cheesecake aux Fraises' },
     description: { ar: 'طبقة كريمية غنية مغطاة بصوص الفراولة الطازجة', en: 'Rich creamy layer topped with fresh strawberry sauce', fr: 'Couche crémeuse riche nappée de sauce aux fraises fraîches' },
      price: 7.5,
      image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500',
      category: 'desserts',
      attributes: { isVegetarian: true, isSpicy: false, isGlutenFree: false }
    }
  ];

  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultItems);

  // جلب رقم الطاولة من الرابط
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get('table');
    if (tableFromUrl) {
      setCurrentTable(tableFromUrl);
      localStorage.setItem('tableId', tableFromUrl);
    } else {
      const savedTable = localStorage.getItem('tableId');
      if (savedTable) setCurrentTable(savedTable);
    }
  }, []);

  // 🔄 الربط الحي مع الفايربيس (مع تصفية البيانات حصرياً حسب restaurantId)
  useEffect(() => {
    if (!restaurantId) return;

    // استعلام لفلترة الأطباق التابعة لهذا المطعم فقط
    const q = query(
      collection(db, 'menu'),
      where('restaurantId', '==', restaurantId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbItems: MenuItem[] = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: typeof data.name === 'object' ? data.name : { ar: data.nameAr || data.name || '', en: data.name || '', fr: data.name || '' },
            description: typeof data.description === 'object' ? data.description : { ar: data.description || '', en: '', fr: '' },
            price: Number(data.price || 0),
            image: data.image || data.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
            category: data.category || 'burgers',
            available: data.available !== false,
            attributes: data.attributes || { isVegetarian: false, isSpicy: false, isGlutenFree: false }
          };
        })
        .filter((item) => item.available);

      // دمج العناصر الافتراضية مع عناصر المطعم الحالي
      setMenuItems([...defaultItems, ...dbItems]);
    }, (error) => {
      console.error("Error fetching menu items by restaurantId:", error);
    });

    return () => unsubscribe();
  }, [restaurantId]);

  const setTable = (tableNum: string) => {
    setCurrentTable(tableNum);
    localStorage.setItem('tableId', tableNum);
  };

  const handleSetRestaurantId = (id: string) => {
    setRestaurantId(id);
    localStorage.setItem('restaurantId', id);
  };

  return (
    <MenuContext.Provider value={{ menuItems, themeColor, setThemeColor, currentTable, setTable, restaurantId, setRestaurantId: handleSetRestaurantId }}>
      {children}
    </MenuContext.Provider>
  );
};