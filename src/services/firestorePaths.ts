import type { RestaurantId } from '../types/firestore';

const restaurant = (restaurantId: RestaurantId) => `restaurants/${restaurantId}`;

/**
 * Canonical Firestore paths for the approved restaurant-scoped schema.
 *
 * This module is intentionally not wired into existing callers yet. Keeping it
 * separate from the cutover avoids changing production data paths before the
 * migration plan and rules tests are approved.
 */
export const firestorePaths = {
  restaurant,
  settings: {
    theme: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/settings/theme`,
    operational: (restaurantId: RestaurantId) =>
      `${restaurant(restaurantId)}/settings/operational`,
    loyalty: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/settings/loyalty`,
  },
  menuItems: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/menuItems`,
    document: (restaurantId: RestaurantId, menuItemId: string) =>
      `${restaurant(restaurantId)}/menuItems/${menuItemId}`,
  },
  categories: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/categories`,
    document: (restaurantId: RestaurantId, categoryId: string) =>
      `${restaurant(restaurantId)}/categories/${categoryId}`,
  },
  qrConfig: {
    default: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/qrConfig/default`,
  },
  staff: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/staff`,
    document: (restaurantId: RestaurantId, staffId: string) =>
      `${restaurant(restaurantId)}/staff/${staffId}`,
  },
  customers: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/customers`,
    document: (restaurantId: RestaurantId, customerId: string) =>
      `${restaurant(restaurantId)}/customers/${customerId}`,
  },
  orders: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/orders`,
    document: (restaurantId: RestaurantId, orderId: string) =>
      `${restaurant(restaurantId)}/orders/${orderId}`,
  },
  inventory: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/inventory`,
    document: (restaurantId: RestaurantId, inventoryItemId: string) =>
      `${restaurant(restaurantId)}/inventory/${inventoryItemId}`,
  },
  recipes: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/recipes`,
    document: (restaurantId: RestaurantId, recipeId: string) =>
      `${restaurant(restaurantId)}/recipes/${recipeId}`,
  },
  reviews: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/reviews`,
    document: (restaurantId: RestaurantId, reviewId: string) =>
      `${restaurant(restaurantId)}/reviews/${reviewId}`,
  },
  complaints: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/complaints`,
    document: (restaurantId: RestaurantId, complaintId: string) =>
      `${restaurant(restaurantId)}/complaints/${complaintId}`,
  },
  expenses: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/expenses`,
    document: (restaurantId: RestaurantId, expenseId: string) =>
      `${restaurant(restaurantId)}/expenses/${expenseId}`,
  },
  suppliers: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/suppliers`,
    document: (restaurantId: RestaurantId, supplierId: string) =>
      `${restaurant(restaurantId)}/suppliers/${supplierId}`,
  },
  stockTakes: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/stockTakes`,
    document: (restaurantId: RestaurantId, stockTakeId: string) =>
      `${restaurant(restaurantId)}/stockTakes/${stockTakeId}`,
  },
  wasteLogs: {
    collection: (restaurantId: RestaurantId) => `${restaurant(restaurantId)}/wasteLogs`,
    document: (restaurantId: RestaurantId, wasteLogId: string) =>
      `${restaurant(restaurantId)}/wasteLogs/${wasteLogId}`,
  },
} as const;
