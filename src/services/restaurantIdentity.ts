import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { RestaurantId } from '../types/firestore';

/**
 * Canonical restaurant identity status.
 * Describes the state of a restaurant from the platform's perspective.
 */
export type RestaurantStatus = 'active' | 'inactive' | 'suspended' | 'unknown';

/**
 * Canonical restaurant identity record.
 * This is the authoritative restaurant context for the application.
 */
export interface RestaurantIdentity {
  id: RestaurantId;
  name: string;
  status: RestaurantStatus;
  exists: boolean;
}

/**
 * Result of resolving a restaurant identity from UX context.
 */
export interface RestaurantResolutionResult {
  identity: RestaurantIdentity | null;
  source: 'url' | 'localStorage' | 'claims' | 'default' | 'none';
  error?: string;
}

const DEFAULT_RESTAURANT_ID = 'default_restaurant';

/**
 * Restaurant Identity Service
 * 
 * Provides canonical restaurant identity resolution for the MenuFlow platform.
 * 
 * DESIGN PRINCIPLES:
 * 1. URL parameters and localStorage carry UX/navigation context ONLY.
 * 2. They are NEVER used as security authority for private restaurant data.
 * 3. The canonical restaurant identity is resolved from Firestore (authoritative).
 * 4. Claims provide the authenticated actor's restaurant scope.
 * 5. Security decisions are made server-side using claims and rules.
 * 
 * FUTURE (Gate 8.4+):
 * - Waiter-selected restaurant context will use this service.
 * - QR ordering will use this service.
 * - The service will be extended with restaurant selection UI.
 */

/**
 * Get restaurantId from URL parameters (UX context only).
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

/**
 * Get restaurantId from localStorage (UX context only).
 */
export const getRestaurantIdFromStorage = (): string | null => {
  try {
    const restaurantId = localStorage.getItem('restaurantId');
    return restaurantId && restaurantId.trim().length > 0 ? restaurantId.trim() : null;
  } catch {
    return null;
  }
};

/**
 * Set restaurantId in localStorage (UX context only).
 * This is for navigation convenience only and does not grant authorization.
 */
export const setRestaurantIdInStorage = (restaurantId: string): void => {
  try {
    localStorage.setItem('restaurantId', restaurantId);
  } catch {
    // Storage may be unavailable (private browsing, quota exceeded)
  }
};

/**
 * Resolve canonical restaurant identity from Firestore.
 * This is the authoritative source of restaurant existence and status.
 * 
 * @param restaurantId - The restaurant ID to resolve
 * @returns The canonical restaurant identity, or null if not found
 */
export const resolveRestaurantIdentity = async (
  restaurantId: string
): Promise<RestaurantIdentity | null> => {
  if (!restaurantId || restaurantId.trim().length === 0) {
    return null;
  }

  try {
    const restaurantSnap = await getDoc(doc(db, 'restaurants', restaurantId));

    if (!restaurantSnap.exists()) {
      return {
        id: restaurantId,
        name: '',
        status: 'unknown',
        exists: false,
      };
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
 * Resolve restaurant identity from all available UX context sources.
 * Order of precedence:
 * 1. URL parameter (explicit navigation context)
 * 2. localStorage (persisted UX context)
 * 3. Default restaurant fallback
 * 
 * SECURITY NOTE: The returned restaurantId is UX context ONLY.
 * Server-side authorization (Firestore rules, callable functions) remains authoritative.
 * 
 * @returns The resolution result with identity and source information
 */
export const resolveRestaurantFromContext = async (): Promise<RestaurantResolutionResult> => {
  // 1. Try URL parameter
  const urlRestaurantId = getRestaurantIdFromUrl();
  if (urlRestaurantId) {
    const identity = await resolveRestaurantIdentity(urlRestaurantId);
    return {
      identity: identity || {
        id: urlRestaurantId,
        name: '',
        status: 'unknown',
        exists: false,
      },
      source: 'url',
    };
  }

  // 2. Try localStorage
  const storageRestaurantId = getRestaurantIdFromStorage();
  if (storageRestaurantId) {
    const identity = await resolveRestaurantIdentity(storageRestaurantId);
    return {
      identity: identity || {
        id: storageRestaurantId,
        name: '',
        status: 'unknown',
        exists: false,
      },
      source: 'localStorage',
    };
  }

  // 3. Default fallback
  const defaultIdentity = await resolveRestaurantIdentity(DEFAULT_RESTAURANT_ID);
  if (defaultIdentity) {
    return {
      identity: defaultIdentity,
      source: 'default',
    };
  }

  return {
    identity: null,
    source: 'none',
  };
};

/**
 * Check if a restaurant is in a valid state for customer operations.
 * @param identity - The restaurant identity to check
 */
export const isRestaurantAvailableForCustomers = (identity: RestaurantIdentity | null): boolean => {
  return identity?.exists === true && identity.status === 'active';
};