import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import type { RestaurantId } from '../types/firestore';

export type RestaurantStatus = 'active' | 'inactive' | 'suspended' | 'unknown';

export interface RestaurantIdentity {
  id: RestaurantId;
  name: string;
  status: RestaurantStatus;
  exists: boolean;
}

export interface RestaurantResolutionResult {
  identity: RestaurantIdentity | null;
  source: 'url' | 'localStorage' | 'claims' | 'default' | 'none';
  error?: string;
}

const DEFAULT_RESTAURANT_ID = 'default_restaurant';

/**
 * Restaurant Identity Service
 *
 * URL parameters and localStorage are UX/navigation context only.
 * They never grant authorization. For authenticated staff, the signed
 * Firebase ID token is the trusted source of the actor's primary restaurant.
 * Firestore remains authoritative for restaurant existence and status.
 */

export const getRestaurantIdFromUrl = (): string | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    const restaurantId = params.get('restaurantId');
    return restaurantId && restaurantId.trim().length > 0 ? restaurantId.trim() : null;
  } catch {
    return null;
  }
};

export const getRestaurantIdFromStorage = (): string | null => {
  try {
    const restaurantId = localStorage.getItem('restaurantId');
    return restaurantId && restaurantId.trim().length > 0 ? restaurantId.trim() : null;
  } catch {
    return null;
  }
};

export const setRestaurantIdInStorage = (restaurantId: string): void => {
  try {
    localStorage.setItem('restaurantId', restaurantId);
  } catch {
    // Storage may be unavailable (private browsing, quota exceeded)
  }
};

/**
 * Read the authenticated actor's primary restaurant from the signed ID token.
 * This is identity context, not a substitute for membership authorization.
 */
export const getRestaurantIdFromClaims = async (): Promise<string | null> => {
  try {
    const user = getAuth().currentUser;
    if (!user) return null;
    const tokenResult = await user.getIdTokenResult();
    const role = tokenResult.claims.role;
    const restaurantId = tokenResult.claims.restaurantId;
    if (typeof role !== 'string' || role === 'SuperAdmin') return null;
    return typeof restaurantId === 'string' && restaurantId.trim().length > 0
      ? restaurantId.trim()
      : null;
  } catch {
    return null;
  }
};

export const resolveRestaurantIdentity = async (
  restaurantId: string
): Promise<RestaurantIdentity | null> => {
  if (!restaurantId || restaurantId.trim().length === 0) return null;

  try {
    const restaurantSnap = await getDoc(doc(db, 'restaurants', restaurantId));

    if (!restaurantSnap.exists()) {
      return { id: restaurantId, name: '', status: 'unknown', exists: false };
    }

    const data = restaurantSnap.data();
    const status: RestaurantStatus =
      data.status === 'suspended' ? 'suspended' :
      data.status === 'inactive' ? 'inactive' : 'active';

    return {
      id: restaurantId,
      name: data.name || '',
      status,
      exists: true,
    };
  } catch (error) {
    console.error('Failed to resolve restaurant identity:', error);
    return null;
  }
};

/**
 * Resolve restaurant identity from UX context and trusted identity context.
 * Explicit URL/storage context is preserved for navigation (for example an
 * Admin selecting a secondary restaurant), while backend rules/functions
 * remain authoritative for whether that actor may access the selected tenant.
 */
export const resolveRestaurantFromContext = async (): Promise<RestaurantResolutionResult> => {
  const urlRestaurantId = getRestaurantIdFromUrl();
  if (urlRestaurantId) {
    const identity = await resolveRestaurantIdentity(urlRestaurantId);
    return {
      identity: identity || { id: urlRestaurantId, name: '', status: 'unknown', exists: false },
      source: 'url',
    };
  }

  const storageRestaurantId = getRestaurantIdFromStorage();
  if (storageRestaurantId) {
    const identity = await resolveRestaurantIdentity(storageRestaurantId);
    return {
      identity: identity || { id: storageRestaurantId, name: '', status: 'unknown', exists: false },
      source: 'localStorage',
    };
  }

  const claimsRestaurantId = await getRestaurantIdFromClaims();
  if (claimsRestaurantId) {
    const identity = await resolveRestaurantIdentity(claimsRestaurantId);
    return {
      identity: identity || { id: claimsRestaurantId, name: '', status: 'unknown', exists: false },
      source: 'claims',
    };
  }

  const defaultIdentity = await resolveRestaurantIdentity(DEFAULT_RESTAURANT_ID);
  if (defaultIdentity) return { identity: defaultIdentity, source: 'default' };

  return { identity: null, source: 'none' };
};

export const isRestaurantAvailableForCustomers = (identity: RestaurantIdentity | null): boolean =>
  identity?.exists === true && identity.status === 'active';
