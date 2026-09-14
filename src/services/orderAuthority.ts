/**
 * Order Authority Service
 *
 * Canonical authority model for order creation and mutation in the MenuFlow platform.
 *
 * CORE PRINCIPLES:
 * 1. There is ONE canonical order creation path — both customer and waiter orders
 *    use the same core workflow, distinguished by `orderSource`.
 * 2. The server is authoritative for: order number, pricing, totals, restaurant identity,
 *    table identity, status transitions, and inventory effects.
 * 3. The client may NOT supply: order number, final totals (calculated server-side),
 *    restaurant identity (validated against claims), or status transitions.
 * 4. Order mutations (append, driver claim, status change) are authorized server-side
 *    based on role and tenant membership.
 *
 * ORDER SOURCES:
 * - 'customer': Order placed by a customer through QR/menu interface
 * - 'waiter': Order placed by a waiter on behalf of a customer (Phase 10)
 *
 * DEFERRED (Phase 9):
 * - Server-authoritative pricing (client sends item IDs, server retrieves prices)
 * - Unified price/quantity/total field normalization
 *
 * DEFERRED (Phase 10):
 * - Waiter order creation UI
 * - Waiter-specific fields (waiterId, waiterName)
 */

import type { StaffRole } from '../types/firestore';

/**
 * Order source - distinguishes who initiated the order.
 * Both sources use the same canonical order creation path.
 */
export type OrderSource = 'customer' | 'waiter';

/**
 * Order creation authority - who is allowed to create orders.
 */
export type OrderCreationAuthority = 'anonymous_customer' | 'authenticated_waiter';

/**
 * Order mutation types - the possible mutations to an existing order.
 */
export type OrderMutationType =
  | 'status_change'
  | 'driver_claim'
  | 'driver_assign'
  | 'item_append'
  | 'note_add';

/**
 * Order mutation authority - which roles can perform which mutations.
 */
export const ORDER_MUTATION_AUTHORITY: Record<OrderMutationType, StaffRole[]> = {
  status_change: ['Admin', 'SuperAdmin', 'Kitchen', 'Cashier', 'Delivery'],
  driver_claim: ['Delivery', 'Admin', 'SuperAdmin'],
  driver_assign: ['Admin', 'SuperAdmin'],
  item_append: ['Admin', 'SuperAdmin'],
  note_add: ['Admin', 'SuperAdmin', 'Cashier', 'Kitchen'],
};

/**
 * Check if a role has authority to perform an order mutation.
 */
export const canPerformOrderMutation = (
  role: StaffRole,
  mutationType: OrderMutationType
): boolean => {
  return ORDER_MUTATION_AUTHORITY[mutationType]?.includes(role) ?? false;
};

/**
 * Check if a role has authority to create an order.
 */
export const canCreateOrder = (
  role: StaffRole | 'anonymous',
  source: OrderSource
): boolean => {
  if (source === 'customer' && role === 'anonymous') return true;
  if (source === 'waiter' && role !== 'anonymous') {
    return role === 'Waiter' || role === 'Admin' || role === 'SuperAdmin';
  }
  return false;
};

/**
 * Order creation request - what the client may supply.
 * The server validates and supplements with authoritative values.
 */
export interface OrderCreationRequest {
  items: Array<{
    menuItemId: string;
    quantity: number;
    recipeId?: string | null;
    note?: string;
  }>;
  restaurantId: string;
  tableNumber: string;
  orderSource: OrderSource;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryData?: {
    name?: string;
    address?: string;
    phone?: string;
  };
}

/**
 * Server-authoritative order values - set by the server, never by the client.
 */
export interface ServerAuthoritativeValues {
  orderId: string;
  orderNumber: number;
  status: 'pending';
  totalAmount: number;
  createdAt: Date;
}

/**
 * Order source metadata - records who created the order.
 */
export interface OrderSourceMetadata {
  orderSource: OrderSource;
  customerId?: string;
  waiterId?: string;
  waiterName?: string;
}

/**
 * Get the display name for an order source.
 */
export const getOrderSourceDisplayName = (source: OrderSource): string => {
  switch (source) {
    case 'customer':
      return 'Customer';
    case 'waiter':
      return 'Waiter';
    default:
      return 'Unknown';
  }
};

/**
 * Validate that a restaurant ID is a non-empty string.
 */
export const isValidRestaurantId = (restaurantId: unknown): restaurantId is string => {
  return typeof restaurantId === 'string' && restaurantId.trim().length > 0;
};

/**
 * Validate that a table number is valid.
 */
export const isValidTableNumber = (tableNumber: unknown): tableNumber is string => {
  return typeof tableNumber === 'string' && tableNumber.trim().length > 0 && tableNumber.length <= 32;
};
