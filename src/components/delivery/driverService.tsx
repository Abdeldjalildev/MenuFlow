import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Claim an order for a delivery driver (first-come, first-served).
 * Performs a read-before-write check to prevent race-condition overwrites.
 */
export const claimOrderForDriver = async (
  orderId: string,
  driverId: string,
  driverName: string
): Promise<{ success: boolean; message?: string; error?: unknown }> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return { success: false, message: 'Order not found' };
    }

    const orderData = orderSnap.data();

    if (orderData.isClaimed && orderData.driverId && orderData.driverId !== driverId) {
      return { success: false, message: 'Order already claimed by another driver' };
    }

    const finalDriverName =
      driverName && driverName !== 'السائق'
        ? driverName
        : (localStorage.getItem('userName') || localStorage.getItem('driverName') || 'Delivery Driver');

    await updateDoc(orderRef, {
      driverId,
      driverName: finalDriverName,
      isClaimed: true,
      status: orderData.status === 'preparing' ? 'driver_claimed' : orderData.status,
      claimedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error claiming order for driver:', error);
    return { success: false, error };
  }
};