import type { User } from 'firebase/auth';
import type { StaffRole, RestaurantId } from '../types/firestore';
import { STAFF_ROLES } from '../types/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface AuthzClaims {
  role: StaffRole;
  restaurantId?: RestaurantId;
}

export interface AdminMembership {
  restaurantId: RestaurantId;
  restaurantName: string;
  adminUid: string;
  createdAt: { toDate(): Date; seconds: number; nanoseconds: number };
  createdBy: string;
}

const isStaffRole = (value: unknown): value is StaffRole =>
  typeof value === 'string' && STAFF_ROLES.includes(value as StaffRole);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Read authorization data only from Firebase's signed ID token claims.
 * Client storage may mirror these values for presentation, but it is never
 * accepted as an authorization source.
 */
export const getAuthzClaims = async (user: User): Promise<AuthzClaims | null> => {
  const tokenResult = await user.getIdTokenResult();
  const { role, restaurantId } = tokenResult.claims;

  if (!isStaffRole(role)) return null;
  if (role === 'SuperAdmin') return { role };
  if (!isNonEmptyString(restaurantId)) return null;

  return { role, restaurantId };
};

/**
 * Get all restaurant memberships for an Admin actor.
 * Uses the getAdminMemberships callable function.
 */
export const getAdminMemberships = async (): Promise<AdminMembership[]> => {
  const functions = getFunctions();
  const getMembershipsFn = httpsCallable(functions, 'getAdminMemberships');
  
  const result = await getMembershipsFn({});
  const data = result.data as { memberships: AdminMembership[] };
  
  return data?.memberships || [];
};

/**
 * Check if an Admin actor has membership in a specific restaurant.
 * Returns true if the Admin's primary restaurantId matches or if they have
 * an explicit AdminMembership record.
 */
export const isAdminOfRestaurant = async (
  _user: User,
  claims: AuthzClaims,
  targetRestaurantId: RestaurantId
): Promise<boolean> => {
  // SuperAdmin has implicit access to all restaurants
  if (claims.role === 'SuperAdmin') return true;
  
  // Non-Admin roles can only access their primary restaurant
  if (claims.role !== 'Admin') {
    return claims.restaurantId === targetRestaurantId;
  }
  
  // Admin's primary restaurant
  if (claims.restaurantId === targetRestaurantId) return true;
  
  // Check AdminMembership for non-primary restaurant
  try {
    const memberships = await getAdminMemberships();
    return memberships.some(m => m.restaurantId === targetRestaurantId);
  } catch (error) {
    console.error('Failed to check Admin membership:', error);
    return false;
  }
};
