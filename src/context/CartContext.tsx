import React, { createContext, useState, useContext } from 'react';

// Cart line item shape with notes and pricing
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  image?: string;
}

// Menu item shape as referenced by cart resolution functions
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

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  const handleAddToCart = (id: string) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 1) {
        newCart[id] -= 1;
      } else {
        delete newCart[id];
      }
      return newCart;
    });
  };

  const updateNote = (id: string, note: string) => 
    setNotes(prev => ({ ...prev, [id]: note }));

  const clearCart = () => {
    setCart({});
    setNotes({});
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // Resolve cart IDs into full item objects using the current menu
  const getCartItemsDetails = (menuItems: MenuItem[]): CartItem[] => {
   return Object.keys(cart).map(id => {
  const item = menuItems.find(m => m.id === id || m._id === id);

  const rawName = item?.name ?? item?.nameAr;

  const name =
    typeof rawName === 'string'
      ? rawName
      : rawName && typeof rawName === 'object'
        ? rawName.ar || rawName.fr || rawName.en || 'وجبة'
        : 'وجبة';

  return {
    id,
    name,
    price: Number(item?.price ?? 0),
    quantity: cart[id],
    note: notes[id] ?? '',
    image: item?.image ?? '',
  };
});
  };

  // Compute the cart total from live menu pricing
  const calculateTotal = (menuItems: MenuItem[]): number => {
    return Object.keys(cart).reduce((sum, id) => {
      const item = menuItems.find(m => m.id === id || m._id === id);
      const price = Number(item?.price || 0);
      return sum + (price * cart[id]);
    }, 0);
  };

  return (
    <CartContext.Provider value={{ 
      cart, 
      notes, 
      handleAddToCart, 
      removeFromCart,
      updateNote, 
      clearCart, 
      cartCount,
      getCartItemsDetails,
      calculateTotal
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};