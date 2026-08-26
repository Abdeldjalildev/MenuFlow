import React, { createContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'driver_claimed'
  | 'ready'
  | 'ready_for_payment'
  | 'ready_for_delivery'
  | 'on_the_way'
  | 'delivered_unpaid'
  | 'paid'
  | 'completed'
  | 'TrackDone';

// Firestore Timestamp shape for safe .toDate() access
interface FirestoreTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

export interface DeliveryData {
  name?: string;
  address?: string;
  phone?: string;
}

export interface OrderItem {
  id?: string;
  menuItemId?: string;
  recipeId?: string | null;
  name?: string | Record<string, string>;
  nameAr?: string;
  price?: number;
  originalPrice?: number;
  unitPrice?: number;
  quantity?: number;
  qty?: number;
  note?: string;
  notes?: string;
  image?: string;
  isAppended?: boolean;
}

export interface PlaceOrderExtraOptions {
  customerId?: string;
  appliedDiscountPercent?: number;
  restaurantId?: string;
  driverName?: string;
  driverPhone?: string;
}

export interface Order {
  id: string;
  restaurantId?: string;
  items: OrderItem[];
  tableNumber: string;
  status: OrderStatus;
  createdAt?: FirestoreTimestamp | string | number;
  orderNumber?: number;
  totalAmount?: number;
  totalPrice?: number;
  customerId?: string;
  customerName?: string | Record<string, string>;
  customerPhone?: string;
  deliveryAddress?: string | Record<string, string>;
  deliveryData?: DeliveryData | null;
  isClaimed?: boolean;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  appliedDiscountPercent?: number;
  rating?: number;
  comment?: string;
}

// Minimal recipe shape for inventory deduction and waste logging
interface Recipe {
  id: string;
  menuItemId?: string;
  nameAr?: string;
  nameFr?: string;
  nameEn?: string;
  cost?: number;
  recipeIngredients?: Array<{
    inventoryItemId?: string;
    quantity?: number;
  }>;
}

// ---------------------------------------------------------------------------
// Context Contract
// ---------------------------------------------------------------------------

interface OrderContextType {
  orders: Order[];
  placeOrder: (
    items: OrderItem[],
    tableNumber: string,
    deliveryData?: DeliveryData | null,
    totalAmount?: number,
    extraOptions?: PlaceOrderExtraOptions
  ) => Promise<void>;
  appendToOrder: (orderId: string, newItems: OrderItem[]) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  addReview: (orderId: string, rating: number, comment: string) => Promise<void>;
  claimOrderForDriver: (
    orderId: string,
    driverId: string,
    driverName: string
  ) => Promise<{ success: boolean; message?: string; error?: unknown }>;
}

// Safe default so consumers can destructure without null checks
const OrderContextDefault: OrderContextType = {
  orders: [],
  placeOrder: async () => {},
  appendToOrder: async () => {},
  updateOrderStatus: async () => {},
  addReview: async () => {},
  claimOrderForDriver: async () => ({
    success: false,
    message: 'OrderContext not initialized',
  }),
};

export const OrderContext = createContext<OrderContextType>(OrderContextDefault);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getCustomerId = (): string => {
  let customerId = localStorage.getItem('menu_customer_id');
  if (!customerId) {
    customerId =
      'cust_' +
      Math.random().toString(36).substring(2, 11) +
      '_' +
      Date.now().toString(36);
    localStorage.setItem('menu_customer_id', customerId);
  }
  return customerId;
};

// Safely convert a Firestore timestamp, string, or number into a JS Date
const toJsDate = (value?: FirestoreTimestamp | string | number): Date => {
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as FirestoreTimestamp).toDate();
  }
  return new Date(value as string | number);
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);

  // Current restaurant identifier (fallback for legacy calls without explicit override)
  const restaurantId = localStorage.getItem('restaurantId') || 'default_restaurant';

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)
      );
    });

    return () => unsubscribe();
  }, [restaurantId]);

  // -------------------------------------------------------------------------
  // placeOrder
  // -------------------------------------------------------------------------
  const placeOrder = async (
    items: OrderItem[],
    tableNumber: string,
    deliveryData?: DeliveryData | null,
    totalAmount?: number,
    extraOptions?: PlaceOrderExtraOptions
  ) => {
    if (!items || items.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter((o) => {
      const date = toJsDate(o.createdAt);
      return date >= today;
    });

    const nextOrderNumber = todayOrders.length + 1;
    const currentCustomerId = extraOptions?.customerId || getCustomerId();
    const shortId = currentCustomerId.slice(-4);

    const calculatedTotal =
      totalAmount ??
      items.reduce((sum, item) => {
        const p = Number(item.price || item.unitPrice || 0);
        const q = Number(item.quantity || item.qty || 1);
        return sum + p * q;
      }, 0);

    const defaultName =
      tableNumber !== '0'
        ? ` زبون طاولة #${tableNumber} (${shortId})`
        : ` زبون خارجي (${shortId})`;

    const payload: Record<string, unknown> = {
      restaurantId: extraOptions?.restaurantId || restaurantId,
      items: items || [],
      tableNumber: tableNumber || '0',
      status: 'pending' as OrderStatus,
      createdAt: serverTimestamp(),
      orderNumber: nextOrderNumber,
      totalAmount: calculatedTotal,
      totalPrice: calculatedTotal,
      customerId: currentCustomerId,
      customerName: deliveryData?.name || defaultName,
      customerPhone: deliveryData?.phone || '',
      deliveryAddress: deliveryData?.address || '',
      deliveryData: deliveryData || null,
      appliedDiscountPercent: extraOptions?.appliedDiscountPercent || 0,
      driverName: extraOptions?.driverName || null,
      driverPhone: extraOptions?.driverPhone || null,
    };

    await addDoc(collection(db, 'orders'), payload);
  };

  // -------------------------------------------------------------------------
  // claimOrderForDriver
  // -------------------------------------------------------------------------
  const claimOrderForDriver = async (
    orderId: string,
    driverId: string,
    driverName: string
  ): Promise<{ success: boolean; message?: string; error?: unknown }> => {
    try {
      const orderRef = doc(db, 'orders', orderId);

      const result = await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);

        if (!orderSnap.exists()) {
          return { success: false, message: 'Order not found' };
        }

        const orderData = orderSnap.data() as Order;

        if (
          orderData.isClaimed &&
          orderData.driverId &&
          orderData.driverId !== driverId
        ) {
          return {
            success: false,
            message: 'Order already claimed by another driver',
          };
        }

        transaction.update(orderRef, {
          isClaimed: true,
          driverId,
          driverName,
          status:
            orderData.status === 'preparing'
              ? 'driver_claimed'
              : orderData.status,
        });

        return { success: true };
      });

      return result;
    } catch (error) {
      console.error('Error claiming order for driver:', error);
      return { success: false, error };
    }
  };

  // -------------------------------------------------------------------------
  // appendToOrder
  // -------------------------------------------------------------------------
  const appendToOrder = async (orderId: string, newItems: OrderItem[]) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        console.error('Order not found for append');
        return;
      }

      const orderData = orderSnap.data() as Order;
      const appendedItems = newItems.map((item) => ({
        ...item,
        isAppended: true,
      }));
      const updatedItems = [...(orderData.items || []), ...appendedItems];

      const appendTotal = newItems.reduce((sum, item) => {
        return sum + Number(item.price || 0) * Number(item.quantity || 1);
      }, 0);

      const newTotal =
        Number(orderData.totalAmount || orderData.totalPrice || 0) + appendTotal;

      await updateDoc(orderRef, {
        items: updatedItems,
        totalAmount: newTotal,
        totalPrice: newTotal,
      });

      // Deduct inventory for newly appended items only
      const firestoreModule = await import('firebase/firestore');
      const recipesQuery = firestoreModule.query(
        firestoreModule.collection(db, 'recipes'),
        firestoreModule.where('restaurantId', '==', restaurantId)
      );
      const recipesSnapshot = await firestoreModule.getDocs(recipesQuery);
      const recipesList: Recipe[] = recipesSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      for (const item of appendedItems) {
        const itemQty = Number(item.quantity || item.qty || 1);
        const matchedRecipe = recipesList.find((r) => {
          if (item.recipeId && r.id === item.recipeId) return true;
          if (item.menuItemId && r.menuItemId === item.menuItemId) return true;
          if (r.id === item.id || r.menuItemId === item.id) return true;

          const itemNameStr =
            typeof item.name === 'string' ? item.name : item.name?.ar;
          const itemArStr = item.nameAr || itemNameStr;

          return (
            (r.nameAr &&
              (r.nameAr === itemArStr || r.nameAr === itemNameStr)) ||
            (r.nameFr &&
              r.nameFr ===
                (typeof item.name === 'string' ? item.name : undefined)) ||
            (r.nameEn &&
              r.nameEn ===
                (typeof item.name === 'string' ? item.name : undefined))
          );
        });

        if (matchedRecipe && Array.isArray(matchedRecipe.recipeIngredients)) {
          for (const ing of matchedRecipe.recipeIngredients) {
            if (!ing.inventoryItemId || !ing.quantity) continue;

            const invRef = doc(db, 'inventory', ing.inventoryItemId);
            const invSnap = await firestoreModule.getDoc(invRef);

            if (invSnap.exists()) {
              const invData = invSnap.data();
              const currentStock = Number(
                invData?.currentQuantity ?? invData?.quantity ?? 0
              );
              const totalDeduction = Number(ing.quantity) * itemQty;
              const newStock = Math.max(0, currentStock - totalDeduction);

              await updateDoc(invRef, {
                quantity: newStock,
                currentQuantity: newStock,
                updatedAt: firestoreModule.serverTimestamp(),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error appending to order:', error);
    }
  };

  // -------------------------------------------------------------------------
  // updateOrderStatus
  // -------------------------------------------------------------------------
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const orderRef = doc(db, 'orders', orderId);
    const payload: { status: OrderStatus; isPaid?: boolean } = {
      status: newStatus,
    };
    if (newStatus === 'completed') {
      payload.isPaid = true;
    }
    await updateDoc(orderRef, payload);

    // Deduct recipe ingredients when the kitchen marks an order ready
    if (
      newStatus === 'ready_for_payment' ||
      newStatus === 'ready_for_delivery' ||
      newStatus === 'ready'
    ) {
      try {
        const currentOrder = orders.find((o) => o.id === orderId);
        if (
          !currentOrder ||
          !currentOrder.items ||
          !Array.isArray(currentOrder.items)
        )
          return;

        const firestoreModule = await import('firebase/firestore');
        const recipesQuery = firestoreModule.query(
          firestoreModule.collection(db, 'recipes'),
          firestoreModule.where('restaurantId', '==', restaurantId)
        );
        const recipesSnapshot = await firestoreModule.getDocs(recipesQuery);
        const recipesList: Recipe[] = recipesSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        for (const item of currentOrder.items) {
          const itemQty = Number(item.quantity || item.qty || 1);
          const matchedRecipe = recipesList.find((r) => {
            if (item.recipeId && r.id === item.recipeId) return true;
            if (item.menuItemId && r.menuItemId === item.menuItemId)
              return true;
            if (r.id === item.id || r.menuItemId === item.id) return true;

            const itemNameStr =
              typeof item.name === 'string' ? item.name : item.name?.ar;
            const itemArStr = item.nameAr || itemNameStr;

            return (
              (r.nameAr &&
                (r.nameAr === itemArStr || r.nameAr === itemNameStr)) ||
              (r.nameFr &&
                r.nameFr ===
                  (typeof item.name === 'string' ? item.name : undefined)) ||
              (r.nameEn &&
                r.nameEn ===
                  (typeof item.name === 'string' ? item.name : undefined))
            );
          });

          if (matchedRecipe && Array.isArray(matchedRecipe.recipeIngredients)) {
            for (const ing of matchedRecipe.recipeIngredients) {
              if (!ing.inventoryItemId || !ing.quantity) continue;

              const invRef = doc(db, 'inventory', ing.inventoryItemId);
              const invSnap = await firestoreModule.getDoc(invRef);

              if (invSnap.exists()) {
                const invData = invSnap.data();
                const currentStock = Number(
                  invData?.currentQuantity ?? invData?.quantity ?? 0
                );
                const totalDeduction = Number(ing.quantity) * itemQty;
                const newStock = Math.max(0, currentStock - totalDeduction);

                await updateDoc(invRef, {
                  quantity: newStock,
                  currentQuantity: newStock,
                  updatedAt: firestoreModule.serverTimestamp(),
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error deducting ingredients from inventory:', error);
      }
    }

    // Payment & completion side effects: loyalty, discount reset, waste logging
    if (newStatus === 'paid' || newStatus === 'completed') {
      try {
        const currentOrder = orders.find((o) => o.id === orderId);
        if (!currentOrder) return;

        if (currentOrder.customerId) {
          const customerRef = doc(db, 'customers', currentOrder.customerId);
          const customerSnap = await getDoc(customerRef);
          const paidAmount = Number(
            currentOrder.totalAmount || currentOrder.totalPrice || 0
          );
          const earnedPoints = Math.floor(paidAmount / 100);

          if (customerSnap.exists()) {
            const currentPoints = Number(customerSnap.data().points || 0);
            await updateDoc(customerRef, {
              activeDiscount: 0,
              points: currentPoints + earnedPoints,
              updatedAt: serverTimestamp(),
            });
          } else {
            const firestoreModule = await import('firebase/firestore');
            await firestoreModule.setDoc(customerRef, {
              restaurantId,
              customerId: currentOrder.customerId,
              points: earnedPoints,
              activeDiscount: 0,
              createdAt: serverTimestamp(),
            });
          }
        }

        if (currentOrder.items && Array.isArray(currentOrder.items)) {
          const firestoreModule = await import('firebase/firestore');
          const recipesQuery = firestoreModule.query(
            firestoreModule.collection(db, 'recipes'),
            firestoreModule.where('restaurantId', '==', restaurantId)
          );
          const recipesSnapshot = await firestoreModule.getDocs(recipesQuery);

          const recipesList: Recipe[] = recipesSnapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            menuItemId: docSnap.data().menuItemId,
            nameAr: docSnap.data().nameAr,
            cost: Number(docSnap.data().cost || 0),
          }));

          let totalOrderCost = 0;
          currentOrder.items.forEach((item) => {
            const matchedRecipe = recipesList.find(
              (r) =>
                (item.recipeId && r.id === item.recipeId) ||
                (item.menuItemId && r.menuItemId === item.menuItemId) ||
                r.nameAr ===
                  (typeof item.name === 'string' ? item.name : item.name?.ar) ||
                r.nameAr === item.nameAr
            );

            const recipeCost = matchedRecipe ? matchedRecipe.cost : 0;
            const quantity = Number(item?.quantity || item?.qty || 1);
            totalOrderCost += (recipeCost || 0) * quantity;
          });

          if (totalOrderCost > 0) {
            const wasteLogRef = collection(db, 'waste_log');
            await addDoc(wasteLogRef, {
              restaurantId,
              orderId,
              estimatedLoss: totalOrderCost,
              reason: 'Automatic consumption via sales',
              createdAt: new Date(),
            });
          }
        }
      } catch (error) {
        console.error('Error processing payment and loyalty system:', error);
      }
    }
  };

  // -------------------------------------------------------------------------
  // addReview
  // -------------------------------------------------------------------------
  const addReview = async (
    orderId: string,
    rating: number,
    comment: string
  ) => {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { rating, comment });

    const currentOrder = orders.find((o) => o.id === orderId);

    try {
      const reviewsRef = collection(db, 'reviews');
      await addDoc(reviewsRef, {
        restaurantId,
        orderId,
        rating,
        comment,
        createdAt: new Date(),
      });

      const complaintsRef = collection(db, 'complaints');
      await addDoc(complaintsRef, {
        restaurantId,
        orderId,
        customerName:
          (typeof currentOrder?.customerName === 'string'
            ? currentOrder.customerName
            : undefined) || 'Customer',
        customerPhone:
          currentOrder?.customerPhone ||
          currentOrder?.deliveryData?.phone ||
          '',
        tableNumber: currentOrder?.tableNumber || '0',
        message:
          comment ||
          (rating >= 4
            ? 'Positive feedback without comment'
            : 'Note/complaint without comment'),
        rating,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdAtRaw: Date.now(),
      });
    } catch (error) {
      console.error('Error syncing review to reports and complaints:', error);
    }
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        placeOrder,
        appendToOrder,
        updateOrderStatus,
        addReview,
        claimOrderForDriver,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};