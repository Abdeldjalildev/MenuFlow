import { createContext, useContext } from 'react';

// نقلنا التعريف هنا لإنهاء الخطأ
export interface MenuItem {
  id: string;
  name: { ar: string; en: string; fr: string };
  description: { ar: string; en: string; fr: string };
  price: number;
  image: string;
  category: string;
  attributes: { isVegetarian: boolean; isSpicy: boolean; isGlutenFree: boolean; };
}

export interface MenuContextType {
  menuItems: MenuItem[];
  themeColor: string;
  setThemeColor: (color: string) => void;
  currentTable: string | null;
  setTable: (tableNum: string) => void;
  restaurantId: string;          
  setRestaurantId: (id: string) => void; 
}

export const MenuContext = createContext<MenuContextType | undefined>(undefined);

// إضافة هذا الـ Hook يسهل عليك الاستدعاء في كل الملفات
export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) throw new Error("useMenu must be used within a MenuProvider");
  return context;
};