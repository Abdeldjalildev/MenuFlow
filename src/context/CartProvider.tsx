import React, { useState } from 'react';
import { CartContext } from './CartContext';
import type { CartItem } from './CartContext';

interface MenuItem {
  id?: string;
  _id?: string;
  name?: string | Record<string, string>;
  nameAr?: string;
  price?: number;
  image?: string;
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  const handleAddToCart = (id: string) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 1) newCart[id] -= 1;
      else delete newCart[id];
      return newCart;
    });
  };

  const updateNote = (id: string, note: string) => {
    setNotes(prev => ({ ...prev, [id]: note }));
  };

  const clearCart = () => {
    setCart({});
    setNotes({});
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const getCartItemsDetails = (menuItems: MenuItem[]): CartItem[] => {
    return Object.keys(cart).map(id => {
      const item = menuItems.find(m => m.id === id || m._id === id);
      const rawName = item?.name ?? item?.nameAr;
      const name = typeof rawName === 'string'
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

  const calculateTotal = (menuItems: MenuItem[]): number => {
    return Object.keys(cart).reduce((sum, id) => {
      const item = menuItems.find(m => m.id === id || m._id === id);
      return sum + Number(item?.price || 0) * cart[id];
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
      calculateTotal,
    }}>
      {children}
    </CartContext.Provider>
  );
};