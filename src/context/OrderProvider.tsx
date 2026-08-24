import React, { createContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, getDoc, serverTimestamp, where } from 'firebase/firestore';

// 🎯 دالة جلب أو إنشاء معرّف الجهاز الفريد للزبون
const getCustomerId = (): string => {
  let customerId = localStorage.getItem('menu_customer_id');
  if (!customerId) {
    customerId = 'cust_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('menu_customer_id', customerId);
  }
  return customerId;
};

export interface Order {
  id: string;
  restaurantId?: string;
  items: any[];
  tableNumber: string;
  status: 'pending' | 'preparing' | 'driver_claimed' | 'ready_for_delivery' | 'ready' | 'delivered_unpaid' | 'paid' | 'completed';
  createdAt: any;
  orderNumber: number;
  totalAmount?: number;
  totalPrice?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryData?: {
    name?: string;
    address?: string;
    phone?: string;
  };
  isClaimed?: boolean;
  driverId?: string;
  driverName?: string;
}

export const OrderContext = createContext<any>(null);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  // 🏢 معرف المطعم الحالي
  const restaurantId = localStorage.getItem('restaurantId') || 'default_restaurant';

  useEffect(() => {
    // 🏢 جلب الطلبات الخاصة بهذا المطعم فقط
    const q = query(
      collection(db, "orders"), 
      where("restaurantId", "==", restaurantId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
    return () => unsubscribe();
  }, [restaurantId]);

  // 🎯 إرسال الطلب وحفظ البيانات مع restaurantId
  const placeOrder = async (items: any, tableNumber: string, deliveryData?: any, totalAmount?: number, extraOptions?: { customerId?: string }) => {
    if (!items) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter(o => {
      const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return date >= today;
    });
    
    const nextOrderNumber = todayOrders.length + 1;
    const currentCustomerId = extraOptions?.customerId || getCustomerId();
    const shortId = currentCustomerId.slice(-4);

    // حساب المجموع تلقائياً
    const calculatedTotal = totalAmount ?? items.reduce((sum: number, item: any) => {
      const p = Number(item.price || item.unitPrice || 0);
      const q = Number(item.quantity || item.qty || 1);
      return sum + (p * q);
    }, 0);

    const defaultName = tableNumber !== '0' 
      ?` زبون طاولة #${tableNumber} (${shortId})`
      :` زبون خارجي (${shortId})`;

    const orderPayload: any = { 
      restaurantId: restaurantId, // 👈 ربط الطلب بالمطعم الحالي
      items: items || [], 
      tableNumber: tableNumber || '0', 
      status: 'pending', 
      createdAt: serverTimestamp(),
      orderNumber: nextOrderNumber,
      totalAmount: calculatedTotal,
      totalPrice: calculatedTotal,
      customerId: currentCustomerId,

      customerName: deliveryData?.name || defaultName,
      customerPhone: deliveryData?.phone || '',
      deliveryAddress: deliveryData?.address || '',

      deliveryData: deliveryData || null
    };

    await addDoc(collection(db, "orders"), orderPayload);
  };

  // 🛵 دالة حجز الطلب بواسطة السائق
  const claimOrderForDriver = async (orderId: string, driverId: string, driverName: string) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        return { success: false, message: "الطلب غير موجود" };
      }

      const orderData = orderSnap.data();
   // التحقق مما إذا كان الطلب محجوزاً مسبقاً من طرف سائق آخر
      if (orderData.isClaimed && orderData.driverId && orderData.driverId !== driverId) {
        return { success: false, message: "الطلب محجوز بالفعل بواسطة سائق آخر" };
      }

      await updateDoc(orderRef, {
        isClaimed: true,
        driverId: driverId,
        driverName: driverName,
        status: orderData.status === 'preparing' ? 'driver_claimed' : orderData.status
      });

      return { success: true };
    } catch (error) {
      console.error("خطأ أثناء حجز الطلب للسائق:", error);
      return { success: false, error };
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: any) => {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status: newStatus });

    // 1️⃣ خصم المكونات من المخزون عند تجهيز الطلب
    if (newStatus === 'ready_for_payment' || newStatus === 'ready_for_delivery' || newStatus === 'ready') {
      try {
        const currentOrder = orders.find(o => o.id === orderId);
        if (!currentOrder || !currentOrder.items || !Array.isArray(currentOrder.items)) return;
        
        const firestoreModule = await import('firebase/firestore');
        // جلب الوصفات الخاصة بالمطعم فقط
        const recipesQuery = firestoreModule.query(
          firestoreModule.collection(db, 'recipes'),
          firestoreModule.where('restaurantId', '==', restaurantId)
        );
        const recipesSnapshot = await firestoreModule.getDocs(recipesQuery);
        const recipesList = recipesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

        for (const item of currentOrder.items) {
          const itemQty = Number(item.quantity || item.qty || 1);
          const matchedRecipe: any = recipesList.find((r: any) => {
            if (item.recipeId && r.id === item.recipeId) return true;
            if (item.menuItemId && r.menuItemId === item.menuItemId) return true;
            if (r.id === item.id || r.menuItemId === item.id) return true;

            const itemNameStr = typeof item.name === 'string' ? item.name : item.name?.ar;
            const itemArStr = item.nameAr || itemNameStr;

            return (
              (r.nameAr && (r.nameAr === itemArStr || r.nameAr === itemNameStr)) 
              (r.nameFr && r.nameFr === item.name) ||
              (r.nameEn && r.nameEn === item.name)
            );
          });

          if (matchedRecipe && Array.isArray(matchedRecipe.recipeIngredients)) {
            for (const ing of matchedRecipe.recipeIngredients) {
              if (!ing.inventoryItemId || !ing.quantity) continue;

              const invRef = doc(db, 'inventory', ing.inventoryItemId);
              const invSnap = await firestoreModule.getDoc(invRef);

              if (invSnap.exists()) {
                const invData = invSnap.data();
                const currentStock = Number(invData.currentQuantity ?? invData.quantity ?? 0);
                const totalDeduction = Number(ing.quantity) * itemQty;
                const newStock = Math.max(0, currentStock - totalDeduction);

                await updateDoc(invRef, { 
                  quantity: newStock,
                  currentQuantity: newStock,
                  updatedAt: firestoreModule.serverTimestamp()
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("خطأ أثناء خصم المكونات من المخزون:", error);
      }
    }

    // 2️⃣ عند الدفع (Paid): حساب الهالك + تصفير الخصم المستهلك + إضافة نقاط الولاء
    if (newStatus === 'paid' || newStatus === 'delivered_unpaid') {
      try {
        const currentOrder = orders.find(o => o.id === orderId);
        if (!currentOrder) return;

        // 🟢 أ) تصفير الخصم وزيادة نقاط الولاء للزبون
        if (currentOrder.customerId) {
          const customerRef = doc(db, 'customers', currentOrder.customerId);
          const customerSnap = await getDoc(customerRef);
          const paidAmount = Number(currentOrder.totalAmount || currentOrder.totalPrice || 0);
          const earnedPoints = Math.floor(paidAmount / 100);

          if (customerSnap.exists()) {
            const currentPoints = Number(customerSnap.data().points || 0);
            await updateDoc(customerRef, {
              activeDiscount: 0, 
              points: currentPoints + earnedPoints, 
              updatedAt: serverTimestamp()
            });
          } else {
            const firestoreModule = await import('firebase/firestore');
            await firestoreModule.setDoc(customerRef, {
              restaurantId: restaurantId,
              customerId: currentOrder.customerId,
              points: earnedPoints,
              activeDiscount: 0,
              createdAt: serverTimestamp()
            });
          }
        }

        // 🟢 ب) احتساب تكلفة الهالك والمبيعات
        if (currentOrder.items && Array.isArray(currentOrder.items)) {
          const firestoreModule = await import('firebase/firestore');
          const recipesQuery = firestoreModule.query(
            firestoreModule.collection(db, 'recipes'),
            firestoreModule.where('restaurantId', '==', restaurantId)
          );
          const recipesSnapshot = await firestoreModule.getDocs(recipesQuery);
          
          const recipesList = recipesSnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            menuItemId: docSnap.data().menuItemId,
            nameAr: docSnap.data().nameAr,
            cost: Number(docSnap.data().cost || 0)
          }));
          
          let totalOrderCost = 0;
          currentOrder.items.forEach((item: any) => {
            const matchedRecipe = recipesList.find(r =>
              (item.recipeId && r.id === item.recipeId) ||
              (item.menuItemId && r.menuItemId === item.menuItemId) ||
              r.nameAr === item?.name ||
              r.nameAr === item?.nameAr
            );
            
            const recipeCost = matchedRecipe ? matchedRecipe.cost : 0;
            const quantity = Number(item?.quantity || item?.qty || 1);
            
            totalOrderCost += (recipeCost * quantity);
          });

          if (totalOrderCost > 0) {
            const wasteLogRef = collection(db, "waste_log");
            await addDoc(wasteLogRef, {
              restaurantId: restaurantId, // 👈 وسم سجل الهالك بالمطعم
              orderId: orderId,
              estimatedLoss: totalOrderCost,
              reason: "استهلاك تلقائي عبر المبيعات",
              createdAt: new Date()
            });
          }
        }
      } catch (error) {
        console.error("خطأ أثناء معالجة الدفع ونظام النقاط:", error);
      }
    }
  };
  
  const addReview = async (orderId: string, rating: number, comment: string) => {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { rating, comment });

    const currentOrder = orders.find((o: any) => o.id === orderId);

    try {
      const reviewsRef = collection(db, "reviews");
      await addDoc(reviewsRef, {
        restaurantId: restaurantId,
        orderId,
        rating,
        comment,
        createdAt: new Date()
      });
      const complaintsRef = collection(db, "complaints");
      await addDoc(complaintsRef, {
        restaurantId: restaurantId,
        orderId,
        customerName: currentOrder?.customerName || 'زبون',
        customerPhone: currentOrder?.customerPhone || currentOrder?.deliveryData?.phone || '',
        tableNumber: currentOrder?.tableNumber || '0',
        message: comment || (rating >= 4 ? 'رأي إيجابي بدون تعليق' : 'ملاحظة/شكوى بدون تعليق'),
        rating: rating,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdAtRaw: Date.now()
      });

    } catch (error) {
      console.error("خطأ أثناء إرسال التقييم السحابي لقسم التقارير والشكاوى:", error);
    }
  };

  return (
    <OrderContext.Provider value={{ orders, placeOrder, updateOrderStatus, addReview, claimOrderForDriver }}>
      {children}
    </OrderContext.Provider>
  );
};