/**
 * Canonical Firestore domain contracts.
 *
 * These types describe the approved target schema only. They do not migrate
 * existing data or grant client-side authorization.
 */

export type RestaurantId = string;

/**
 * Canonical role vocabulary for the MenuFlow platform.
 *
 * Roles are organized into three tiers:
 * - Platform roles: SuperAdmin (platform owner)
 * - Administrative roles: Admin (restaurant administrator)
 * - Operational roles: Kitchen, Cashier, Delivery, Waiter (restaurant staff)
 *
 * IMPORTANT: A user's Firebase Auth identity is NOT the same as their role.
 * Identity is established by Firebase Auth UID. Role is established by custom claims.
 * Membership is the relationship between an actor and a restaurant.
 */
export const PLATFORM_ROLES = ['SuperAdmin'] as const;
export const ADMIN_ROLES = ['Admin'] as const;
export const OPERATIONAL_ROLES = ['Kitchen', 'Cashier', 'Delivery', 'Waiter'] as const;
export const STAFF_ROLES = [...PLATFORM_ROLES, ...ADMIN_ROLES, ...OPERATIONAL_ROLES] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type AdminRole = (typeof ADMIN_ROLES)[number];
export type OperationalRole = (typeof OPERATIONAL_ROLES)[number];

export const TENANT_SCOPED_ROLES: readonly StaffRole[] = [
  'Admin', 'Cashier', 'Kitchen', 'Delivery', 'Waiter',
];

export const PROVISIONABLE_BY_ADMIN: readonly StaffRole[] = [
  'Cashier', 'Kitchen', 'Delivery', 'Waiter',
];

export const Permission = {
  MANAGE_ADMINS: 'manage_admins',
  MANAGE_RESTAURANTS: 'manage_restaurants',
  VIEW_PLATFORM_ANALYTICS: 'view_platform_analytics',
  MANAGE_STAFF: 'manage_staff',
  MANAGE_MENU: 'manage_menu',
  MANAGE_ORDERS: 'manage_orders',
  VIEW_RESTAURANT_ANALYTICS: 'view_restaurant_analytics',
  CREATE_ORDER: 'create_order',
  UPDATE_ORDER_STATUS: 'update_order_status',
  ASSIGN_DRIVER: 'assign_driver',
  PLACE_ORDER: 'place_order',
  VIEW_OWN_ORDERS: 'view_own_orders',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export interface FirebaseAuthIdentity {
  uid: string;
  email?: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
  isAnonymous: boolean;
}

export interface PlatformOwnerActor {
  identity: FirebaseAuthIdentity;
  role: PlatformRole;
  permissions: Permission[];
}

/**
 * Admin membership - the authoritative relationship between an Admin actor
 * and a Restaurant. Stored at restaurants/{restaurantId}/admins/{adminUid}.
 */
export interface AdminMembership {
  restaurantId: RestaurantId;
  adminUid: string;
  createdAt: FirestoreDate;
  createdBy: string;
}

export interface RestaurantMembership {
  actorUid: string;
  restaurantId: string;
  grantedAt: FirestoreDate;
  grantedBy: string;
}

export interface AdminActor {
  identity: FirebaseAuthIdentity;
  role: AdminRole;
  memberships: AdminMembership[];
  permissions: Permission[];
}

export interface StaffActor {
  identity: FirebaseAuthIdentity;
  role: OperationalRole;
  membership: RestaurantMembership;
  permissions: Permission[];
}

export interface CustomerActor {
  identity: FirebaseAuthIdentity;
  permissions: Permission[];
}

export type MenuFlowActor = PlatformOwnerActor | AdminActor | StaffActor | CustomerActor;
export type FirestoreDate = Date | { toDate(): Date; seconds: number; nanoseconds: number };

export interface LocalizedText { ar: string; en: string; fr: string; }
export interface TenantDocument { restaurantId: RestaurantId; createdAt?: FirestoreDate; updatedAt?: FirestoreDate; }
export interface RestaurantDocument { uid: string; name: string; owner: string; email: string; plan: 'monthly' | 'quarterly' | 'yearly'; status: 'active' | 'inactive' | 'suspended'; createdAt?: FirestoreDate; updatedAt?: FirestoreDate; }
export interface ThemeSettingsDocument extends TenantDocument { logoUrl?: string; primaryColor: string; secondaryColor: string; welcomeBgType?: 'color' | 'image'; welcomeBgColor?: string; welcomeBgImage?: string; welcomeBgOpacity?: number; welcomeBgBlur?: number; menuBannerUrl?: string; menuBgType?: 'color' | 'image'; menuBgColor?: string; menuBgImage?: string; menuBgOpacity?: number; menuBgBlur?: number; }
export interface OperationalSettingsDocument extends TenantDocument { restaurantName: string; taxRate: number; deliveryFee: number; }
export interface LoyaltySettingsDocument extends TenantDocument { pointsPerCurrencyUnit: number; discountPercent: number; pointsRequiredForDiscount: number; }
export interface MenuItemDocument extends TenantDocument { name: LocalizedText; description?: LocalizedText; price: number; categoryId: string; image?: string; recipeId?: string | null; isAvailable: boolean; }
export interface CategoryDocument extends TenantDocument { name: LocalizedText; sortOrder?: number; isActive: boolean; }
export interface QrTable { id: string; name: string; status: 'active' | 'reserved' | 'maintenance'; }
export interface QrConfigDocument extends TenantDocument { tables: QrTable[]; includeDelivery: boolean; }
export interface StaffDocument extends TenantDocument { uid: string; name: string; role: StaffRole; phone: string; email?: string; salary: number; status: 'active' | 'inactive'; }
export interface CustomerDocument extends TenantDocument { customerId: string; name?: string; phone?: string; points: number; activeDiscount: number; }
export type OrderStatus = 'pending' | 'preparing' | 'driver_claimed' | 'ready' | 'ready_for_payment' | 'ready_for_delivery' | 'on_the_way' | 'delivered_unpaid' | 'paid' | 'completed' | 'TrackDone';
export interface OrderItemDocument { menuItemId: string; recipeId?: string | null; name: string | LocalizedText; price: number; quantity: number; note?: string; }
export interface OrderDocument extends TenantDocument {
  items: OrderItemDocument[];
  tableNumber: string;
  status: OrderStatus;
  orderNumber?: number;
  totalAmount: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  driverId?: string;
  driverName?: string;
  isClaimed?: boolean;
  orderSource?: OrderSource;
  waiterId?: string;
  waiterName?: string;
  customerNotes?: string;
}
export type OrderSource = 'customer' | 'waiter';
export interface OrderTransition { from: OrderStatus; to: OrderStatus; role: StaffRole; }
export interface InventoryDocument extends TenantDocument { name: string; unit: string; quantity: number; currentQuantity?: number; minimumQuantity?: number; }
export interface RecipeIngredient { inventoryItemId: string; quantity: number; }
export interface RecipeDocument extends TenantDocument { menuItemId?: string; name: LocalizedText; cost: number; recipeIngredients: RecipeIngredient[]; }
export interface ReviewDocument extends TenantDocument { orderId: string; rating: number; comment?: string; }
export interface ComplaintDocument extends TenantDocument { orderId?: string; customerName?: string; customerPhone?: string; message: string; rating?: number; status: 'pending' | 'resolved'; }
export interface ExpenseDocument extends TenantDocument { title: string; amount: number; category: string; notes?: string; }
export interface SupplierDocument extends TenantDocument { companyName: string; contactName?: string; phone?: string; email?: string; }
export interface StockTakeDocument extends TenantDocument { inventoryItemId: string; previousQuantity: number; countedQuantity: number; difference: number; notes?: string; }
export interface WasteLogDocument extends TenantDocument { inventoryItemId?: string; orderId?: string; estimatedLoss: number; reason: string; }
