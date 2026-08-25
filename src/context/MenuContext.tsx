import { useMenu as useProviderMenu } from './MenuProvider';

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

type ProviderMenuValue = {
  menuItems: MenuItem[];
  themeColor: string;
  currentTable: string;
  setCurrentTable: (tableNum: string) => void;
  restaurantId: string;
};

// Expose the provider-backed menu contract to existing consumers without creating a second React context.
export const useMenu = (): MenuContextType => {
  const context = useProviderMenu() as ProviderMenuValue;

  return {
    menuItems: context.menuItems,
    themeColor: context.themeColor,
    currentTable: context.currentTable,
    setTable: context.setCurrentTable,
    restaurantId: context.restaurantId,
  };
};