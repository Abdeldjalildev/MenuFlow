/**
 * Canonical tenant-scoped Firestore paths.
 *
 * These helpers intentionally require the restaurant ID explicitly so callers
 * cannot silently fall back to localStorage, URL parameters, or a default
 * tenant when constructing security-sensitive paths.
 */

const requireTenantId = (restaurantId: string): string => {
  const value = restaurantId.trim();
  if (!value) {
    throw new Error('A non-empty restaurantId is required for tenant-scoped data.');
  }
  return value;
};

export const restaurantPath = (restaurantId: string): string =>
  `restaurants/${requireTenantId(restaurantId)}`;

export const restaurantCollectionPath = (
  restaurantId: string,
  collectionName: string,
): string => {
  const tenant = requireTenantId(restaurantId);
  const collection = collectionName.trim();
  if (!collection) throw new Error('A collection name is required.');
  return `restaurants/${tenant}/${collection}`;
};

export const restaurantDocumentPath = (
  restaurantId: string,
  collectionName: string,
  documentId: string,
): string => {
  const document = documentId.trim();
  if (!document) throw new Error('A document ID is required.');
  return `${restaurantCollectionPath(restaurantId, collectionName)}/${document}`;
};

export const tenantPaths = {
  settings: (restaurantId: string, key: string) =>
    restaurantDocumentPath(restaurantId, 'settings', key),
  menuItem: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'menuItems', id),
  category: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'categories', id),
  qrConfig: (restaurantId: string) =>
    restaurantDocumentPath(restaurantId, 'qrConfig', 'default'),
  staff: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'staff', id),
  customer: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'customers', id),
  order: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'orders', id),
  inventory: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'inventory', id),
  recipe: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'recipes', id),
  review: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'reviews', id),
  complaint: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'complaints', id),
  expense: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'expenses', id),
  supplier: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'suppliers', id),
  stockTake: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'stockTakes', id),
  wasteLog: (restaurantId: string, id: string) =>
    restaurantDocumentPath(restaurantId, 'wasteLogs', id),
} as const;
