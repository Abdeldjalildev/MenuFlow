import type { User } from 'firebase/auth';
import type { StaffRole, RestaurantId } from '../types/firestore';
import { STAFF_ROLES } from '../types/firestore';

export interface AuthzClaims {
  role: StaffRole;
  restaurantId?: RestaurantId;
}

const isStaffRole = (value: unknown): value is StaffRole =>
  typeof value === 'string' && STAFF_ROLES.includes(value as StaffRole);

/**
 * Read authorization data only from Firebase's signed ID token claims.
 * Client storage may mirror these values for presentation, but it is never
 * accepted as an authorization source.
 */
export const getAuthzClaims = async (user: User): Promise<AuthzClaims | null> => {
  const tokenResult = await user.getIdTokenResult();
  const { role, restaurantId } = tokenResult.claims;

  if (!isStaffRole(role)) return null;
  if (role !== 'SuperAdmin' && typeof restaurantId !== 'string') return null;
  if (role === 'SuperAdmin') return { role };

  return { role, restaurantId };
};
