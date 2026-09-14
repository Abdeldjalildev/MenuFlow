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
 * Read authentication identity only from Firebase's signed ID token claims.
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
 * Get all explicit restaurant memberships for the authenticated Admin actor.
 * Uses the getAdminMemberships callable function, whose backend authorization
 * derives the caller identity from Firebase Auth.
 */
export const getAdminMemberships = async (): Promise<AdminMembership[]> => {
  const functions = getFunctions();
  const getMembershipsFn = httpsCallable(functions, 'getAdminMemberships');
  const result = await getMembershipsFn({});
  const data = result.data as { memberships: AdminMembership[] };
  return data?.memberships || [];
};

/**
 * Check whether the actor is authorized for a restaurant.
 * SuperAdmin is platform-wide; Admin access is determined exclusively by
 * explicit AdminMembership records; operational roles remain claim-scoped.
 */
export const isAdminOfRestaurant = async (
  user: User,
  claims: AuthzClaims,
  targetRestaurantId: RestaurantId
): Promise<boolean> => {
  if (!isNonEmptyString(targetRestaurantId)) return false;
  if (claims.role === 'SuperAdmin') return true;

  if (claims.role !== 'Admin') {
    return claims.restaurantId === targetRestaurantId;
  }

  try {
    const memberships = await getAdminMemberships();
    return memberships.some(
      membership => membership.adminUid === user.uid && membership.restaurantId === targetRestaurantId,
    );
  } catch (error) {
    console.error('Failed to check Admin membership:', error);
    return false;
  }
};
