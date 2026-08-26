import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { MenuContext, MenuItem } from './MenuContext';

const defaultItems: MenuItem[] = [
  { id: 'default_1', name: { ar: 'برجر كلاسيك', en: 'Classic Burger', fr: 'Burger Classique' }, price: 450, category: 'burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60' },
  { id: 'default_2', name: { ar: 'بيتزا مارغريتا', en: 'Margherita Pizza', fr: 'Pizza Margherita' }, price: 600, category: 'pizzas', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=500&q=60' },
  { id: 'default_3', name: { ar: 'باستا ألفريدو', en: 'Alfredo Pasta', fr: 'Pâtes Alfredo' }, price: 550, category: 'pasta', image: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=500&q=60' },
  { id: 'default_4', name: { ar: 'سلطة سيزر', en: 'Caesar Salad', fr: 'Salade César' }, price: 350, category: 'salads', image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=500&q=60' },
  { id: 'default_5', name: { ar: 'كباب مشوي', en: 'Grilled Kebab', fr: 'Kebab Grillé' }, price: 700, category: 'grill', image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6f54262?auto=format&fit=crop&w=500&q=60' },
  { id: 'default_6', name: { ar: 'تشيز كيك فراولة', en: 'Strawberry Cheesecake', fr: 'Cheesecake Fraise' }, price: 300, category: 'desserts', image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=500&q=60' }
];

const getInitialRestaurantId = (): string => {
  const params = new URLSearchParams(window.location.search);
  return params.get('restaurantId') || localStorage.getItem('restaurantId') || 'default_restaurant';
};

const getInitialTable = (): string => {
  const params = new URLSearchParams(window.location.search);
  return params.get('table') || localStorage.getItem('currentTable') || '0';
};

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [themeColor, setThemeColor] = useState('#4f46e5');
  const [currentTable, setCurrentTable] = useState<string>(getInitialTable);
  const [restaurantId] = useState<string>(getInitialRestaurantId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');

    localStorage.setItem('restaurantId', restaurantId);
    if (table) {
      localStorage.setItem('currentTable', table);
    }

    const fetchTheme = async () => {
      try {
        const themeDoc = await getDoc(doc(db, 'restaurants', restaurantId, 'settings', 'theme'));
        if (themeDoc.exists()) {
          const data = themeDoc.data();
          setThemeColor(typeof data.primaryColor === 'string' ? data.primaryColor : '#4f46e5');
        }
      } catch (error) {
        console.error('Error fetching theme:', error);
      }
    };
    void fetchTheme();

    const q = query(
      collection(db, 'restaurants', restaurantId, 'menuItems'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dbItems: MenuItem[] = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        })) as MenuItem[];

        setMenuItems(dbItems.length > 0 ? dbItems : [...defaultItems]);
      },
      (error) => {
        console.error('Error fetching menu items:', error);
      }
    );

    return () => unsubscribe();
  }, [restaurantId]);

  const setTable = (tableNum: string) => {
    setCurrentTable(tableNum);
    localStorage.setItem('currentTable', tableNum);
  };

  return (
    <MenuContext.Provider value={{ menuItems, themeColor, currentTable, setTable, restaurantId }}>
      {children}
    </MenuContext.Provider>
  );
};
