export const MENUFLOW_ROLES = [
  'SuperAdmin',
  'Admin',
  'Cashier',
  'Kitchen',
  'Delivery',
] as const;

export type MenuFlowRole = (typeof MENUFLOW_ROLES)[number];

export interface TrustedAuthzClaims {
  role: MenuFlowRole;
  restaurantId: string | null;
}

export const isMenuFlowRole = (value: unknown): value is MenuFlowRole =>
  typeof value === 'string' &&
  (MENUFLOW_ROLES as readonly string[]).includes(value);

/**
 * Parse Firebase ID-token claims into the only authorization shape the UI may use.
 * Browser storage and URL parameters are intentionally ignored here.
 */
export const parseTrustedAuthzClaims = (
  claims: Record<string, unknown>,
): TrustedAuthzClaims | null => {
  const role = claims.role;
  if (!isMenuFlowRole(role)) return null;

  if (role === 'SuperAdmin') {
    return { role, restaurantId: null };
  }

  const restaurantId = claims.restaurantId;
  if (typeof restaurantId !== 'string' || restaurantId.trim() === '') {
    return null;
  }

  return { role, restaurantId };
};

export const roleDestination = (role: MenuFlowRole): string => {
  switch (role) {
    case 'SuperAdmin':
      return '/super-admin';
    case 'Admin':
      return '/merchant/overview';
    case 'Cashier':
      return '/cashier';
    case 'Kitchen':
      return '/kitchen';
    case 'Delivery':
      return '/delivery';
  }
};
