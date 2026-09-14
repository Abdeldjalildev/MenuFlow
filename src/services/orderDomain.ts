import type { LocalizedText } from '../types/firestore';

/** Canonical lifecycle used by the application domain. */
export type CanonicalOrderStatus =
  | 'pending'
  | 'preparing'
  | 'driver_claimed'
  | 'ready'
  | 'ready_for_payment'
  | 'ready_for_delivery'
  | 'on_the_way'
  | 'delivered_unpaid'
  | 'paid'
  | 'completed';

export const CANONICAL_ORDER_STATUSES: readonly CanonicalOrderStatus[] = [
  'pending',
  'preparing',
  'driver_claimed',
  'ready',
  'ready_for_payment',
  'ready_for_delivery',
  'on_the_way',
  'delivered_unpaid',
  'paid',
  'completed',
];

export type LegacyOrderStatus = 'TrackDone';
export type CanonicalOrderItem = {
  menuItemId: string;
  recipeId?: string | null;
  name: string | LocalizedText;
  price: number;
  quantity: number;
  note?: string;
};

/**
 * Boundary-only compatibility: old documents may contain TrackDone, but the
 * application domain never carries it forward as a canonical status.
 */
export const normalizeOrderStatus = (status: unknown): CanonicalOrderStatus => {
  if (status === 'TrackDone') return 'completed';
  if (typeof status === 'string' && (CANONICAL_ORDER_STATUSES as readonly string[]).includes(status)) {
    return status as CanonicalOrderStatus;
  }
  return 'pending';
};

/**
 * Normalize legacy aliases into one canonical order-item representation.
 * price is the single canonical unit-price field; quantity is the single
 * canonical quantity field. Pricing authority remains a Phase 9.2 concern.
 */
export const normalizeOrderItem = (item: Record<string, unknown>): CanonicalOrderItem => {
  const menuItemId = String(item.menuItemId ?? item.id ?? '');
  const price = Number(item.price ?? item.unitPrice ?? item.originalPrice ?? 0);
  const quantity = Number(item.quantity ?? item.qty ?? 1);
  const name = (item.name ?? item.nameAr ?? '') as string | LocalizedText;
  const recipeId = item.recipeId == null ? undefined : String(item.recipeId);
  const note = item.note ?? item.notes;

  if (!menuItemId) throw new Error('Order item requires menuItemId.');
  if (!Number.isFinite(price) || price < 0) throw new Error('Order item price must be a non-negative number.');
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Order item quantity must be greater than zero.');

  return {
    menuItemId,
    ...(recipeId ? { recipeId } : {}),
    name,
    price,
    quantity,
    ...(typeof note === 'string' && note ? { note: note.slice(0, 500) } : {}),
  };
};

export const normalizeOrderItems = (items: unknown): CanonicalOrderItem[] => {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new Error('Order items must contain between 1 and 50 items.');
  }
  return items.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid order item.');
    return normalizeOrderItem(item as Record<string, unknown>);
  });
};

export const calculateOrderTotal = (items: CanonicalOrderItem[]): number => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!Number.isFinite(total) || total < 0) throw new Error('Order total is invalid.');
  return total;
};
