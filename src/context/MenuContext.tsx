import { createContext } from 'react';

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
  restaurantId: string;
  setCurrentTable: (tableNum: string) => void;
}

// Shared domain contract retained for menu-related consumers.
export const MenuContext = createContext<MenuContextType | undefined>(undefined);