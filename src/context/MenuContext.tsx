import { createContext, useContext } from 'react';

export interface LocalizedText {
  ar: string;
  en: string;
  fr: string;
}

export interface MenuItem {
  id: string;
  _id?: string;
  name: LocalizedText;
  description?: LocalizedText;
  price: number;
  image?: string;
  category: string;
  recipeId?: string | null;
  attributes?: {
    isVegetarian?: boolean;
    isSpicy?: boolean;
    isGlutenFree?: boolean;
  };
}

export interface MenuContextType {
  menuItems: MenuItem[];
  themeColor: string;
  currentTable: string;
  setTable: (tableNum: string) => void;
  restaurantId: string;
}

export const MenuContext = createContext<MenuContextType | null>(null);

export const useMenu = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within MenuProvider');
  }
  return context;
};