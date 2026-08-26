import { createContext, useContext } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  image?: string;
}

interface MenuItem {
  id?: string;
  _id?: string;
  name?: string | Record<string, string>;
  nameAr?: string;
  price?: number;
  image?: string;
}

interface CartContextType {
  cart: { [key: string]: number };
  notes: { [key: string]: string };
  handleAddToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  updateNote: (id: string, note: string) => void;
  clearCart: () => void;
  cartCount: number;
  getCartItemsDetails: (menuItems: MenuItem[]) => CartItem[];
  calculateTotal: (menuItems: MenuItem[]) => number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};