import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export type OperationalNotificationType = 'new_order' | 'order_transition';

export interface OperationalNotification {
  id: string;
  restaurantId: string;
  type: OperationalNotificationType;
  orderId: string;
  orderNumber?: number;
  status?: string;
  createdAt?: unknown;
  acknowledgedAt?: unknown;
}

/** Browser-side operational notifications are intentionally read-only. Creation belongs to the trusted backend event producer. */
export const listOperationalNotifications = async (restaurantId: string, maxResults = 20): Promise<OperationalNotification[]> => {
  if (!restaurantId || !Number.isInteger(maxResults) || maxResults < 1 || maxResults > 50) return [];
  const snapshot = await getDocs(query(
    collection(db, 'restaurants', restaurantId, 'notifications'),
    where('type', 'in', ['new_order', 'order_transition']),
    limit(maxResults),
  ));
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<OperationalNotification, 'id'>) }));
};
