import { collection, addDoc, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore';
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

/**
 * Customer/browser code must never create privileged operational alerts.
 * This service is intentionally read-only until a trusted backend event producer
 * is introduced under Gate 11.4's authorization contract.
 */
export const listOperationalNotifications = async (
  restaurantId: string,
  maxResults = 20,
): Promise<OperationalNotification[]> => {
  if (!restaurantId || !Number.isInteger(maxResults) || maxResults < 1 || maxResults > 50) return [];

  const snapshot = await getDocs(query(
    collection(db, 'restaurants', restaurantId, 'notifications'),
    where('type', 'in', ['new_order', 'order_transition']),
    limit(maxResults),
  ));

  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<OperationalNotification, 'id'>) }));
};

// Reserved for the trusted backend event producer. It deliberately cannot be
// reached from customer UX code and is kept here only as the domain contract.
export const OPERATIONAL_NOTIFICATION_COLLECTION = 'notifications' as const;
export const OPERATIONAL_NOTIFICATION_TIMESTAMP = serverTimestamp;
export const OPERATIONAL_NOTIFICATION_QUERY = query;
export const OPERATIONAL_NOTIFICATION_WHERE = where;
export const OPERATIONAL_NOTIFICATION_ADD_DOC = addDoc;
