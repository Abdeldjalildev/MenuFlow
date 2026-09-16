import React, { createContext, useEffect, useMemo, useRef, useState, useContext } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase';
import { useMenu } from './MenuContext';

const CART_STORAGE_VERSION = 'v1';
const MAX_CART_ITEMS = 50;
const MAX_QUANTITY = 100;
const MAX_NOTE_LENGTH = 500;
const MAX_STORAGE_BYTES = 20_000;

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

interface PersistedCart {
  items: Record<string, number>;
  notes: Record<string, string>;
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

const safeStorageRemove = (key: string) => {
  try { localStorage.removeItem(key); } catch { /* storage is best-effort UX state */ }
};

const safeStorageRead = (key: string): PersistedCart | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > MAX_STORAGE_BYTES) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const value = parsed as Record<string, unknown>;
    if (!value.items || typeof value.items !== 'object' || Array.isArray(value.items)) return null;
    if (!value.notes || typeof value.notes !== 'object' || Array.isArray(value.notes)) return null;
    return { items: value.items as Record<string, number>, notes: value.notes as Record<string, string> };
  } catch {
    return null;
  }
};

const sanitizePersistedCart = (persisted: PersistedCart, validIds: Set<string>): PersistedCart => {
  const items: Record<string, number> = {};
  const notes: Record<string, string> = {};
  for (const [id, rawQuantity] of Object.entries(persisted.items)) {
    if (!validIds.has(id) || Object.keys(items).length >= MAX_CART_ITEMS) continue;
    const quantity = Number(rawQuantity);
    if (!Number.isInteger(quantity) || quantity < 1) continue;
    items[id] = Math.min(quantity, MAX_QUANTITY);
    const note = persisted.notes[id];
    if (typeof note === 'string' && note.trim()) notes[id] = note.slice(0, MAX_NOTE_LENGTH);
  }
  return { items, notes };
};

const storageKey = (restaurantId: string, table: string, uid: string) => {
  const tableKey = table.trim() || 'unknown';
  return `menuflow:cart:${CART_STORAGE_VERSION}:${encodeURIComponent(restaurantId)}:${encodeURIComponent(tableKey)}:${encodeURIComponent(uid)}`;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { menuItems, restaurantId, currentTable } = useMenu();
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const hydratedKeyRef = useRef<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, next => {
    setUser(next);
    setAuthReady(true);
  }), []);

  const activeKey = user?.uid ? storageKey(restaurantId, currentTable, user.uid) : null;

  // Restore only after Firebase has established the current identity. This prevents
  // one authenticated customer's cart from being restored to another customer.
  // The resets below intentionally stay synchronous with hydration: when the active
  // restaurant/table/customer scope has no persisted cart (or no scope is active yet), any cart
  // state left over from the previous scope must be dropped before it could reach another tenant.
  /* eslint-disable react-hooks/set-state-in-effect -- synchronous cross-scope cart reset is required to prevent stale restaurant/table/customer cart state */
  useEffect(() => {
    if (!authReady || !activeKey) {
      hydratedKeyRef.current = null;
      setCart({});
      setNotes({});
      return;
    }
    const persisted = safeStorageRead(activeKey);
    if (!persisted) {
      hydratedKeyRef.current = activeKey;
      setCart({});
      setNotes({});
      return;
    }
    const validIds = new Set(menuItems.map(item => item.id || item._id).filter((id): id is string => Boolean(id)));
    // Do not discard a valid persisted cart while the menu listener is still loading.
    if (menuItems.length === 0) return;
    const sanitized = sanitizePersistedCart(persisted, validIds);
    hydratedKeyRef.current = activeKey;
    setCart(sanitized.items);
    setNotes(sanitized.notes);
    try {
      if (Object.keys(sanitized.items).length === 0) safeStorageRemove(activeKey);
      else localStorage.setItem(activeKey, JSON.stringify(sanitized));
    } catch { /* storage remains non-authoritative */ }
  }, [activeKey, authReady, menuItems]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist only recoverable UX state: IDs, quantities, and notes. Prices/totals are
  // intentionally absent because the server is authoritative at order submission.
  useEffect(() => {
    if (!activeKey || hydratedKeyRef.current !== activeKey) return;
    const persisted: PersistedCart = { items: cart, notes };
    try {
      if (Object.keys(cart).length === 0) {
        safeStorageRemove(activeKey);
        return;
      }
      const serialized = JSON.stringify(persisted);
      if (serialized.length > MAX_STORAGE_BYTES) return;
      localStorage.setItem(activeKey, serialized);
    } catch { /* quota/privacy mode must not break ordering */ }
  }, [activeKey, cart, notes]);

  const handleAddToCart = (id: string) => {
    if (!id || (cart[id] === undefined && Object.keys(cart).length >= MAX_CART_ITEMS)) return;
    setCart(prev => ({ ...prev, [id]: Math.min((prev[id] || 0) + 1, MAX_QUANTITY) }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 1) newCart[id] -= 1;
      else delete newCart[id];
      return newCart;
    });
  };

  const updateNote = (id: string, note: string) =>
    setNotes(prev => ({ ...prev, [id]: note.slice(0, MAX_NOTE_LENGTH) }));

  const clearCart = () => {
    setCart({});
    setNotes({});
    if (activeKey) safeStorageRemove(activeKey);
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const getCartItemsDetails = (menuItems: MenuItem[]): CartItem[] => Object.keys(cart).map(id => {
    const item = menuItems.find(m => m.id === id || m._id === id);
    const rawName = item?.name ?? item?.nameAr;
    const name = typeof rawName === 'string' ? rawName : rawName && typeof rawName === 'object' ? rawName.ar || rawName.fr || rawName.en || 'وجبة' : 'وجبة';
    return { id, name, price: Number(item?.price ?? 0), quantity: cart[id], note: notes[id] ?? '', image: item?.image ?? '' };
  });

  const calculateTotal = (menuItems: MenuItem[]): number => Object.keys(cart).reduce((sum, id) => {
    const item = menuItems.find(m => m.id === id || m._id === id);
    return sum + Number(item?.price || 0) * cart[id];
  }, 0);

  const value = useMemo(() => ({ cart, notes, handleAddToCart, removeFromCart, updateNote, clearCart, cartCount, getCartItemsDetails, calculateTotal }), [cart, notes, cartCount]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
