import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';

/**
 * Atomically claim a tenant-scoped order for the authenticated delivery driver.
 * Tenant identity comes from the signed Firebase claim, not localStorage.
 */
export const claimOrderForDriver = async (
  orderId: string,
  driverId: string,
  driverName: string
): Promise<{ success: boolean; message?: string; error?: unknown }> => {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, message: 'Authentication required' };
    const token = await user.getIdTokenResult();
    const restaurantId = typeof token.claims.restaurantId === 'string' ? token.claims.restaurantId : null;
    if (token.claims.role !== 'Delivery' || !restaurantId) return { success: false, message: 'Delivery authorization required' };

    const orderRef = doc(db, 'restaurants', restaurantId, 'orders', orderId);
    return await runTransaction(db, async transaction => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) return { success: false, message: 'Order not found' };
      const orderData = orderSnap.data();
      if (orderData.isClaimed && orderData.driverId && orderData.driverId !== driverId) return { success: false, message: 'Order already claimed by another driver' };
      transaction.update(orderRef, {
        driverId,
        driverName: driverName || 'Delivery Driver',
        isClaimed: true,
        status: orderData.status === 'preparing' ? 'driver_claimed' : orderData.status,
        claimedAt: serverTimestamp(),
      });
      return { success: true };
    });
  } catch (error) {
    console.error('Error claiming order for driver:', error);
    return { success: false, error };
  }
};
