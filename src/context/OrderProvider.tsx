import React, { createContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { ensureAnonymousCustomer } from '../services/customerAuth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { STAFF_ROLES, type StaffRole } from '../types/firestore';
import { normalizeOrderItem, normalizeOrderStatus, calculateOrderTotal, type CanonicalOrderStatus, type CanonicalOrderItem } from '../services/orderDomain';

export type OrderStatus = CanonicalOrderStatus;
interface FirestoreTimestamp { toDate(): Date; seconds: number; nanoseconds: number }
export interface DeliveryData { name?: string; address?: string; phone?: string }
export interface OrderItem extends Partial<CanonicalOrderItem> { id?: string; nameAr?: string; image?: string; originalPrice?: number; unitPrice?: number; qty?: number; notes?: string; isAppended?: boolean }
export interface PlaceOrderExtraOptions { customerId?: string; appliedDiscountPercent?: number; restaurantId?: string; driverName?: string; driverPhone?: string }
export interface Order { id: string; restaurantId?: string; items: OrderItem[]; tableNumber: string; status: OrderStatus; createdAt?: FirestoreTimestamp | string | number; orderNumber?: number; orderNumberDate?: string; totalAmount?: number; customerId?: string; customerName?: string | Record<string, string>; customerPhone?: string; deliveryAddress?: string | Record<string, string>; deliveryData?: DeliveryData | null; isClaimed?: boolean; driverId?: string; driverName?: string; driverPhone?: string; appliedDiscountPercent?: number; rating?: number; comment?: string; inventoryDeducted?: boolean }
interface OrderContextType { orders: Order[]; placeOrder: (items: OrderItem[], tableNumber: string, deliveryData?: DeliveryData | null, totalAmount?: number, extraOptions?: PlaceOrderExtraOptions) => Promise<void>; appendToOrder: (orderId: string, newItems: OrderItem[]) => Promise<void>; updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>; addReview: (orderId: string, rating: number, comment: string) => Promise<void>; claimOrderForDriver: (orderId: string, driverId: string, driverName: string) => Promise<{ success: boolean; message?: string; error?: unknown }> }
const defaultContext: OrderContextType = { orders: [], placeOrder: async () => {}, appendToOrder: async () => {}, updateOrderStatus: async () => {}, addReview: async () => {}, claimOrderForDriver: async () => ({ success: false, message: 'OrderContext not initialized' }) };
export const OrderContext = createContext<OrderContextType>(defaultContext);
const getRestaurantId = () => new URLSearchParams(window.location.search).get('restaurantId') || localStorage.getItem('restaurantId') || 'default_restaurant';

const normalizeSnapshotOrder = (id: string, raw: Record<string, unknown>): Order => ({
  ...(raw as Omit<Order, 'id' | 'items' | 'status' | 'totalAmount'>),
  id,
  items: Array.isArray(raw.items) ? raw.items.map(item => normalizeOrderItem(item as Record<string, unknown>)) : [],
  status: normalizeOrderStatus(raw.status),
  totalAmount: Number(raw.totalAmount ?? raw.totalPrice ?? 0),
});

const newMutationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]); const [user, setUser] = useState<User | null>(auth.currentUser); const [authReady, setAuthReady] = useState(false); const restaurantId = getRestaurantId();
  useEffect(() => onAuthStateChanged(auth, next => { setUser(next); setAuthReady(true); }), []);
  useEffect(() => {
    if (!authReady) return; let cancelled = false; let unsubscribe: (() => void) | undefined;
    const start = async () => { let currentUser = user; if (!currentUser) { try { currentUser = await ensureAnonymousCustomer(); } catch (error) { console.error('Unable to establish Firebase customer identity:', error); return; } } if (cancelled) return;
      if (currentUser.isAnonymous) { const customerOrders = query(collection(db, 'restaurants', restaurantId, 'orders'), where('customerId', '==', currentUser.uid), orderBy('createdAt', 'desc')); unsubscribe = onSnapshot(customerOrders, snapshot => { if (!cancelled) setOrders(snapshot.docs.map(d => normalizeSnapshotOrder(d.id, d.data()))); }, error => console.error('Customer order listener failed:', error)); return; }
      const token = await currentUser.getIdTokenResult(); const role = token.claims.role; const claimRestaurantId = typeof token.claims.restaurantId === 'string' ? token.claims.restaurantId : undefined; const targetRestaurant = claimRestaurantId || restaurantId; if (!STAFF_ROLES.includes(String(role) as StaffRole)) return;
      const staffOrders = query(collection(db, 'restaurants', targetRestaurant, 'orders'), orderBy('createdAt', 'desc')); unsubscribe = onSnapshot(staffOrders, snapshot => { if (!cancelled) setOrders(snapshot.docs.map(d => normalizeSnapshotOrder(d.id, d.data()))); }, error => console.error('Staff order listener failed:', error));
    }; start(); return () => { cancelled = true; unsubscribe?.(); };
  }, [authReady, user, restaurantId]);
  const placeOrder = async (items: OrderItem[], tableNumber: string, deliveryData?: DeliveryData | null, _totalAmount?: number, extraOptions?: PlaceOrderExtraOptions) => {
    if (!items?.length) return;
    await ensureAnonymousCustomer();
    const targetRestaurant = extraOptions?.restaurantId || restaurantId;
    const canonicalItems = items.map(item => normalizeOrderItem(item as Record<string, unknown>));
    // Phase 9.2/9.3: the server is authoritative for menu prices, modifiers, totals, tenant identity, and order numbering.
    const createOrder = httpsCallable(getFunctions(), 'createOrder');
    await createOrder({ restaurantId: targetRestaurant, items: canonicalItems, tableNumber: tableNumber || '0', deliveryData: deliveryData || null, orderSource: 'customer' });
  };
  const appendToOrder = async (orderId: string, newItems: OrderItem[]) => {
    if (!Array.isArray(newItems) || newItems.length === 0) throw new Error('New order items are required');
    const mutateOrder = httpsCallable(getFunctions(), 'mutateOrder');
    const canonicalItems = newItems.map(item => normalizeOrderItem(item as Record<string, unknown>));
    await mutateOrder({ operation: 'item_append', restaurantId, orderId, mutationId: newMutationId(), items: canonicalItems });
  };
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => { const transitionOrder = httpsCallable(getFunctions(), 'transitionOrder'); await transitionOrder({ orderId, newStatus, restaurantId }); };
  const claimOrderForDriver = async (orderId: string, _driverId: string, _driverName: string) => {
    try {
      const mutateOrder = httpsCallable(getFunctions(), 'mutateOrder');
      await mutateOrder({ operation: 'driver_claim', restaurantId, orderId });
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };
  const addReview = async (orderId: string, rating: number, comment: string) => { const currentUser = auth.currentUser; if (!currentUser?.isAnonymous) throw new Error('Customer authentication required'); if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5'); const orderRef = doc(db, 'restaurants', restaurantId, 'orders', orderId); const orderSnap = await getDoc(orderRef); if (!orderSnap.exists() || (orderSnap.data() as Order).customerId !== currentUser.uid) throw new Error('Order ownership verification failed'); await addDoc(collection(db, 'restaurants', restaurantId, 'reviews'), { restaurantId, orderId, rating, comment: comment.slice(0, 1000), createdAt: serverTimestamp() }); };
  const value = { orders, placeOrder, appendToOrder, updateOrderStatus, addReview, claimOrderForDriver };
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};
