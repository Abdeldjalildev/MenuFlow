import React, { createContext, useState, useEffect, useContext } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';

export const MenuContext = createContext<any>(null);

export const useMenu = () => useContext(MenuContext);

// Starter template items for new restaurants that haven't configured a menu yet
const defaultItems = [
  { 
    id: 'default_1', 
    name: { ar: 'برجر كلاسيك', en: 'Classic Burger', fr: 'Burger Classique' }, 
    price: 450, 
    category: 'burgers', 
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: 'default_2', 
    name: { ar: 'بيتزا مارغريتا', en: 'Margherita Pizza', fr: 'Pizza Margherita' }, 
    price: 600, 
    category: 'pizzas', 
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: 'default_3', 
    name: { ar: 'باستا ألفريدو', en: 'Alfredo Pasta', fr: 'Pâtes Alfredo' }, 
    price: 550, 
    category: 'pasta', 
    image: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: 'default_4', 
    name: { ar: 'سلطة سيزر', en: 'Caesar Salad', fr: 'Salade César' }, 
    price: 350, 
    category: 'salads', 
    image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: 'default_5', 
    name: { ar: 'كباب مشوي', en: 'Grilled Kebab', fr: 'Kebab Grillé' }, 
    price: 700, 
    category: 'grill', 
    image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6f54262?auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: 'default_6', 
    name: { ar: 'تشيز كيك فراولة', en: 'Strawberry Cheesecake', fr: 'Cheesecake Fraise' }, 
    price: 300, 
    category: 'desserts', 
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=500&q=60' 
  }
];

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [themeColor, setThemeColor] = useState('#4f46e5');
  const [currentTable, setCurrentTable] = useState<string>('0');
  const [restaurantId, setRestaurantId] = useState<string>('default_restaurant');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rId = params.get('restaurantId') || localStorage.getItem('restaurantId') || 'default_restaurant';
    setRestaurantId(rId);
    if (rId) localStorage.setItem('restaurantId', rId);

    const table = params.get('table');
    if (table) {
      setCurrentTable(table);
      localStorage.setItem('currentTable', table);
    } else {
      const savedTable = localStorage.getItem('currentTable');
      if (savedTable) setCurrentTable(savedTable);
    }

    // Fetch the restaurant's theme color from Firestore
    const fetchTheme = async () => {
      try {
        const themeDoc = await getDoc(doc(db, 'restaurants', rId, 'settings', 'theme'));
        if (themeDoc.exists()) {
          const data = themeDoc.data();
          setThemeColor(data.primaryColor || '#4f46e5');
        }
      } catch (error) {
        console.error("Error fetching theme:", error);
      }
    };
    fetchTheme();

    // Fetch live menu items for this specific restaurant
    const q = query(collection(db, 'restaurants', rId, 'menuItems'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Only show starter template items when the restaurant has no custom menu yet.
      // Once a restaurant adds even one real item, defaults are fully replaced.
      if (dbItems.length > 0) {
        setMenuItems(dbItems);
      } else {
        setMenuItems([...defaultItems]);
      }
    }, (error) => {
      console.error("Error fetching menu items:", error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <MenuContext.Provider value={{ menuItems, themeColor, currentTable, setCurrentTable, restaurantId }}>
      {children}
    </MenuContext.Provider>
  );
};