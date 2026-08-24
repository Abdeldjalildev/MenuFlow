import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * دالة حجز الطلب من قبل السائق (First-Come, First-Served)
 * تم تعزيزها لتحديث حالة الطلب إلى 'driver_claimed' وإسناد السائق فوراً
 */
export const claimOrderForDriver = async (
  orderId: string, 
  driverId: string, 
  driverName: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    // التحقق من أن الاسم صالح وليس القيمة الافتراضية المبهمة إن وجد بديل في التخزين
    const finalDriverName = driverName && driverName !== 'السائق' 
      ? driverName 
      : (localStorage.getItem('userName') || localStorage.getItem('driverName') || 'سائق توصيل');

    await updateDoc(orderRef, {
      driverId: driverId,
      driverName: finalDriverName,
      isClaimed: true,
      status: 'driver_claimed', // 👈 تحديث الحالة لتفعيل المنظومة البصرية الجديدة
      claimedAt: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error("خطأ أثناء محاولة حجز الطلب:", error);
    return { success: false, error };
  }
};