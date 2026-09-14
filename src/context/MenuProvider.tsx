import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { MenuContext, type MenuItem } from './MenuContext';

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
    if (table) localStorage.setItem('currentTable', table);

    const fetchTheme = async () => {
      try {
        const themeDoc = await getDoc(doc(db, 'restaurants', restaurantId, 'settings', 'theme'));
        if (themeDoc.exists()) {
          const data = themeDoc.data();
          setThemeColor(typeof data.primaryColor === 'string' ? data.primaryColor : '#4f46e5');
        }
      } catch (error) { console.error('Error fetching theme:', error); }
    };
    void fetchTheme();

    const q = query(collection(db, 'restaurants', restaurantId, 'menuItems'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const dbItems = snapshot.docs.map(item => ({ id: item.id, ...item.data() })) as MenuItem[];
      setMenuItems(dbItems);
    }, error => console.error('Error fetching menu items:', error));
    return () => unsubscribe();
  }, [restaurantId]);

  const setTable = useCallback((tableNum: string) => {
    setCurrentTable(tableNum);
    localStorage.setItem('currentTable', tableNum);
  }, []);

  const value = useMemo(() => ({ menuItems, themeColor, currentTable, setTable, restaurantId }), [menuItems, themeColor, currentTable, setTable, restaurantId]);
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};
