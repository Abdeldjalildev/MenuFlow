import React, { createContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from '../firebase';
import { ensureAnonymousCustomer } from '../services/customerAuth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';

export type OrderStatus = 'pending' | 'preparing' | 'driver_claimed' | 'ready' | 'ready_for_payment' | 'ready_for_delivery' | 'on_the_way' | 'delivered_unpaid' | 'paid' | 'completed' | 'TrackDone';
interface FirestoreTimestamp { toDate(): Date; seconds: number; nanoseconds: number }
export interface DeliveryData { name?: string; address?: string; phone?: string }
export interface OrderItem { id?: string; menuItemId?: string; recipeId?: string | null; name?: string | Record<string, string>; nameAr?: string; price?: number; originalPrice?: number; unitPrice?: number; quantity?: number; qty?: number; note?: string; notes?: string; image?: string; isAppended?: boolean }
export interface PlaceOrderExtraOptions { customerId?: string; appliedDiscountPercent?: number; restaurantId?: string; driverName?: string; driverPhone?: string }
export interface Order { id: string; restaurantId?: string; items: OrderItem[]; tableNumber: string; status: OrderStatus; createdAt?: FirestoreTimestamp | string | number; orderNumber?: number; orderNumberDate?: string; totalAmount?: number; totalPrice?: number; customerId?: string; customerName?: string | Record<string, string>; customerPhone?: string; deliveryAddress?: string | Record<string, string>; deliveryData?: DeliveryData | null; isClaimed?: boolean; driverId?: string; driverName?: string; driverPhone?: string; appliedDiscountPercent?: number; rating?: number; comment?: string; inventoryDeducted?: boolean }
interface OrderContextType { orders: Order[]; placeOrder: (items: OrderItem[], tableNumber: string, deliveryData?: DeliveryData | null, totalAmount?: number, extraOptions?: PlaceOrderExtraOptions) => Promise<void>; appendToOrder: (orderId: string, newItems: OrderItem[]) => Promise<void>; updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>; addReview: (orderId: string, rating: number, comment: string) => Promise<void>; claimOrderForDriver: (orderId: string, driverId: string, driverName: string) => Promise<{ success: boolean; message?: string; error?: unknown }> }
const defaultContext: OrderContextType = { orders: [], placeOrder: async () => {}, appendToOrder: async () => {}, updateOrderStatus: async () => {}, addReview: async () => {}, claimOrderForDriver: async () => ({ success: false, message: 'OrderContext not initialized' }) };
export const OrderContext = createContext<OrderContextType>(defaultContext);
const getRestaurantId = () => new URLSearchParams(window.location.search).get('restaurantId') || localStorage.getItem('restaurantId') || 'default_restaurant';

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]); const [user, setUser] = useState<User | null>(auth.currentUser); const [authReady, setAuthReady] = useState(false); const restaurantId = getRestaurantId();
  useEffect(() => onAuthStateChanged(auth, next => { setUser(next); setAuthReady(true); }), []);
  useEffect(() => {
    if (!authReady) return; let cancelled = false; let unsubscribe: (() => void) | undefined;
    const start = async () => { let currentUser = user; if (!currentUser) { try { currentUser = await ensureAnonymousCustomer(); } catch (error) { console.error('Unable to establish Firebase customer identity:', error); return; } } if (cancelled) return;
      if (currentUser.isAnonymous) { const customerOrders = query(collection(db, 'restaurants', restaurantId, 'orders'), where('customerId', '==', currentUser.uid), orderBy('createdAt', 'desc')); unsubscribe = onSnapshot(customerOrders, snapshot => { if (!cancelled) setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Order)); }, error => console.error('Customer order listener failed:', error)); return; }
      const token = await currentUser.getIdTokenResult(); const role = token.claims.role; const claimRestaurantId = typeof token.claims.restaurantId === 'string' ? token.claims.restaurantId : undefined; const targetRestaurant = claimRestaurantId || restaurantId; if (!['SuperAdmin', 'Admin', 'Cashier', 'Kitchen', 'Delivery'].includes(String(role))) return;
      const staffOrders = query(collection(db, 'restaurants', targetRestaurant, 'orders'), orderBy('createdAt', 'desc')); unsubscribe = onSnapshot(staffOrders, snapshot => { if (!cancelled) setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Order)); }, error => console.error('Staff order listener failed:', error));
    }; start(); return () => { cancelled = true; unsubscribe?.(); };
  }, [authReady, user, restaurantId]);
  const placeOrder = async (items: OrderItem[], tableNumber: string, deliveryData?: DeliveryData | null, totalAmount?: number, extraOptions?: PlaceOrderExtraOptions) => {
    if (!items?.length) return;
    const currentUser = auth.currentUser?.isAnonymous ? auth.currentUser : await ensureAnonymousCustomer();
    const targetRestaurant = extraOptions?.restaurantId || restaurantId;
    const calculatedTotal = totalAmount ?? items.reduce((sum, item) => sum + Number(item.price || item.unitPrice || 0) * Number(item.quantity || item.qty || 1), 0);
    // Order creation and daily numbering are server-authoritative and atomic.
    const createOrder = httpsCallable(getFunctions(), 'createOrder');
    await createOrder({ restaurantId: targetRestaurant, items, tableNumber: tableNumber || '0', deliveryData: deliveryData || null, totalAmount: calculatedTotal });
  };
  const appendToOrder = async (orderId: string, newItems: OrderItem[]) => { const ref = doc(db, 'restaurants', restaurantId, 'orders', orderId); await runTransaction(db, async tx => { const snap = await tx.get(ref); if (!snap.exists()) throw new Error('Order not found'); const data = snap.data() as Order; const appended = newItems.map(item => ({ ...item, isAppended: true })); const total = Number(data.totalAmount || data.totalPrice || 0) + appended.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || i.qty || 1), 0); tx.update(ref, { items: [...(data.items || []), ...appended], totalAmount: total, updatedAt: serverTimestamp() }); }); };
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => { const transitionOrder = httpsCallable(getFunctions(), 'transitionOrder'); await transitionOrder({ orderId, newStatus, restaurantId }); };
  const claimOrderForDriver = async (orderId: string, driverId: string, driverName: string) => { try { const ref = doc(db, 'restaurants', restaurantId, 'orders', orderId); const result = await runTransaction(db, async tx => { const snap = await tx.get(ref); if (!snap.exists()) return { success: false, message: 'Order not found' }; const data = snap.data() as Order; if (data.isClaimed && data.driverId && data.driverId !== driverId) return { success: false, message: 'Order already claimed by another driver' }; if (data.isClaimed && data.driverId === driverId) return { success: true, message: 'Order already claimed by this driver' }; tx.update(ref, { isClaimed: true, driverId, driverName, status: data.status === 'preparing' ? 'driver_claimed' : data.status, updatedAt: serverTimestamp() }); return { success: true }; }); return result; } catch (error) { return { success: false, error }; } };
  const addReview = async (orderId: string, rating: number, comment: string) => { const currentUser = auth.currentUser; if (!currentUser?.isAnonymous) throw new Error('Customer authentication required'); if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5'); const orderRef = doc(db, 'restaurants', restaurantId, 'orders', orderId); const orderSnap = await getDoc(orderRef); if (!orderSnap.exists() || (orderSnap.data() as Order).customerId !== currentUser.uid) throw new Error('Order ownership verification failed'); await addDoc(collection(db, 'restaurants', restaurantId, 'reviews'), { restaurantId, orderId, rating, comment: comment.slice(0, 1000), createdAt: serverTimestamp() }); };
  const value = useMemo(() => ({ orders, placeOrder, appendToOrder, updateOrderStatus, addReview, claimOrderForDriver }), [orders]);
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};
