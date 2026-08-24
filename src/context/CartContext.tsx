import React, { createContext, useState, useContext } from 'react';

// هيكل الوجبة في السلة مع الملاحظات والسعر
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  image?: string;
}

interface CartContextType {
  cart: { [key: string]: number };
  notes: { [key: string]: string };
  handleAddToCart: (id: string, itemData?: { name?: string; price?: number; image?: string }) => void;
  removeFromCart: (id: string) => void;
  updateNote: (id: string, note: string) => void;
  clearCart: () => void;
  cartCount: number;
  getCartItemsDetails: (menuItems: any[]) => CartItem[];
  calculateTotal: (menuItems: any[]) => number;
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

  // دالة لتجهيز قائمة العناصر كاملة بالأسماء والأسعار والملاحظات
  const getCartItemsDetails = (menuItems: any[]): CartItem[] => {
    return Object.keys(cart).map(id => {
      const item = menuItems.find(m => m.id === id || m._id === id);
      return {
        id,
        name: item?.name || item?.nameAr || 'وجبة',
        price: Number(item?.price || 0),
        quantity: cart[id],
        note: notes[id] || '',
        image: item?.image || ''
      };
    });
  };

  // دالة حساب المجموع الكلي
  const calculateTotal = (menuItems: any[]): number => {
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