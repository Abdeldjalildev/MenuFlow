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

/**
 * All canonical staff roles. This is the single source of truth for role validation.
 */
export const STAFF_ROLES = [
  ...PLATFORM_ROLES,
  ...ADMIN_ROLES,
  ...OPERATIONAL_ROLES,
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type AdminRole = (typeof ADMIN_ROLES)[number];
export type OperationalRole = (typeof OPERATIONAL_ROLES)[number];

/**
 * Roles that are scoped to a specific restaurant tenant.
 * These roles require a restaurantId claim.
 */
export const TENANT_SCOPED_ROLES: readonly StaffRole[] = [
  'Admin',
  'Cashier',
  'Kitchen',
  'Delivery',
  'Waiter',
];

/**
 * Roles that can be provisioned by a tenant Admin.
 * Admins cannot provision other Admins or SuperAdmins.
 */
export const PROVISIONABLE_BY_ADMIN: readonly StaffRole[] = [
  'Cashier',
  'Kitchen',
  'Delivery',
  'Waiter',
];

/**
 * Canonical permissions for the MenuFlow platform.
 * These represent what an actor is allowed to do within their scope.
 */
export const Permission = {
  // Platform-level permissions
  MANAGE_ADMINS: 'manage_admins',
  MANAGE_RESTAURANTS: 'manage_restaurants',
  VIEW_PLATFORM_ANALYTICS: 'view_platform_analytics',
  
  // Restaurant-level permissions
  MANAGE_STAFF: 'manage_staff',
  MANAGE_MENU: 'manage_menu',
  MANAGE_ORDERS: 'manage_orders',
  VIEW_RESTAURANT_ANALYTICS: 'view_restaurant_analytics',
  
  // Order-level permissions
  CREATE_ORDER: 'create_order',
  UPDATE_ORDER_STATUS: 'update_order_status',
  ASSIGN_DRIVER: 'assign_driver',
  
  // Customer-level permissions
  PLACE_ORDER: 'place_order',
  VIEW_OWN_ORDERS: 'view_own_orders',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * Canonical actor model for the MenuFlow platform.
 *
 * These interfaces define the domain concepts that all subsequent gates
 * and phases will depend on. They establish clear separation between:
 * - IDENTITY: Who the user is (Firebase Auth UID)
 * - ROLE: What permissions they have (custom claims)
 * - MEMBERSHIP: Which restaurant(s) they belong to (claims or Firestore)
 * - PERMISSION: What operations they can perform (derived from role + membership)
 * - RESTAURANT: The business entity being managed
 */

/**
 * Firebase Auth identity - the foundation of all actor types.
 * This is established by Firebase Authentication, NOT by custom claims.
 */
export interface FirebaseAuthIdentity {
  uid: string;
  email?: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
  isAnonymous: boolean;
}

/**
 * Platform Owner / SuperAdmin actor.
 * Has platform-wide authority. Not scoped to any single restaurant.
 * Can create/manage restaurants and provision SuperAdmin claims.
 */
export interface PlatformOwnerActor {
  identity: FirebaseAuthIdentity;
  role: PlatformRole;
  permissions: Permission[];
}

/**
 * Admin membership - the relationship between an Admin actor and a Restaurant.
 * An Admin may manage multiple restaurants through explicit membership records.
 * Stored at: restaurants/{restaurantId}/admins/{adminUid}
 */
export interface AdminMembership {
  adminUid: string;
  createdAt: FirestoreDate;
  createdBy: string;
}

/**
 * The relationship connecting an actor to a restaurant.
 * For staff (Kitchen, Cashier, Delivery, Waiter) this is 1:1.
 * For Admin this is 1:many (tracked via AdminMembership subcollection).
 */
export interface RestaurantMembership {
  actorUid: string;
  restaurantId: string;
  grantedAt: FirestoreDate;
  grantedBy: string;
}

/**
 * Admin actor - restaurant administrator.
 * Can manage one or more restaurants through explicit membership records.
 * Can provision operational staff for their restaurants.
 * Cannot provision other Admins or SuperAdmins.
 * 
 * Admin ↔ Restaurant relationship is tracked via the AdminMembership subcollection
 * at restaurants/{restaurantId}/admins/{adminUid}, enabling multiple restaurants
 * per Admin and independent Admin isolation.
 */
export interface AdminActor {
  identity: FirebaseAuthIdentity;
  role: AdminRole;
  memberships: AdminMembership[];
  permissions: Permission[];
}

/**
 * Staff actor - operational restaurant staff.
 * Belongs operationally to exactly one restaurant.
 * Roles: Kitchen, Cashier, Delivery, Waiter.
 */
export interface StaffActor {
  identity: FirebaseAuthIdentity;
  role: OperationalRole;
  membership: RestaurantMembership;
  permissions: Permission[];
}

/**
 * Customer actor - end customer placing orders.
 * Interacts with restaurants through the ordering flow.
 * Has no staff or administrative privileges.
 */
export interface CustomerActor {
  identity: FirebaseAuthIdentity;
  permissions: Permission[];
}

/**
 * Union type of all possible actors in the system.
 */
export type MenuFlowActor =
  | PlatformOwnerActor
  | AdminActor
  | StaffActor
  | CustomerActor;

/**
 * Firestore timestamp type used across domain documents.
 * Represents a Firestore Timestamp on the server, a Date in the client.
 */
export type FirestoreDate = Date | { toDate(): Date; seconds: number; nanoseconds: number };

export interface LocalizedText {
  ar: string;
  en: string;
  fr: string;
}

export interface TenantDocument {
  restaurantId: RestaurantId;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface RestaurantDocument {
  uid: string;
  name: string;
  owner: string;
  email: string;
  plan: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'inactive' | 'suspended';
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface ThemeSettingsDocument extends TenantDocument {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  welcomeBgType?: 'color' | 'image';
  welcomeBgColor?: string;
  welcomeBgImage?: string;
  welcomeBgOpacity?: number;
  welcomeBgBlur?: number;
  menuBannerUrl?: string;
  menuBgType?: 'color' | 'image';
  menuBgColor?: string;
  menuBgImage?: string;
  menuBgOpacity?: number;
  menuBgBlur?: number;
}

export interface OperationalSettingsDocument extends TenantDocument {
  restaurantName: string;
  taxRate: number;
  deliveryFee: number;
}

export interface LoyaltySettingsDocument extends TenantDocument {
  pointsPerCurrencyUnit: number;
  discountPercent: number;
  pointsRequiredForDiscount: number;
}

export interface MenuItemDocument extends TenantDocument {
  name: LocalizedText;
  description?: LocalizedText;
  price: number;
  categoryId: string;
  image?: string;
  recipeId?: string | null;
  isAvailable: boolean;
}

export interface CategoryDocument extends TenantDocument {
  name: LocalizedText;
  sortOrder?: number;
  isActive: boolean;
}

export interface QrTable {
  id: string;
  name: string;
  status: 'active' | 'reserved' | 'maintenance';
}

export interface QrConfigDocument extends TenantDocument {
  tables: QrTable[];
  includeDelivery: boolean;
}

export interface StaffDocument extends TenantDocument {
  uid: string;
  name: string;
  role: StaffRole;
  phone: string;
  email?: string;
  salary: number;
  status: 'active' | 'inactive';
}

export interface CustomerDocument extends TenantDocument {
  customerId: string;
  name?: string;
  phone?: string;
  points: number;
  activeDiscount: number;
}

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'driver_claimed'
  | 'ready'
  | 'ready_for_payment'
  | 'ready_for_delivery'
  | 'on_the_way'
  | 'delivered_unpaid'
  | 'paid'
  | 'completed'
  | 'TrackDone';

export interface OrderItemDocument {
  menuItemId: string;
  recipeId?: string | null;
  name: string | LocalizedText;
  price: number;
  quantity: number;
  note?: string;
}

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
  /**
   * The source of the order - distinguishes between customer-placed
   * and waiter-placed orders. Both use the same canonical order engine.
   */
  orderSource?: OrderSource;
  /**
   * The UID of the waiter who placed this order (when orderSource === 'waiter').
   * Null/undefined for customer-placed orders.
   */
  waiterId?: string;
  /** The display name of the waiter who placed this order. */
  waiterName?: string;
  /** Customer notes/instructions for the order. */
  customerNotes?: string;
}

/**
 * Order source - distinguishes how an order was created.
 * Both 'customer' and 'waiter' orders flow through the same canonical
 * order creation engine. This field is for provenance tracking only
 * and does not affect order processing logic.
 */
export type OrderSource = 'customer' | 'waiter';

/**
 * Order transition - represents a valid state transition in the order lifecycle.
 * Used to enforce that only authorized roles can perform specific transitions.
 */
export interface OrderTransition {
  from: OrderStatus;
  to: OrderStatus;
  role: StaffRole;
}

export interface InventoryDocument extends TenantDocument {
  name: string;
  unit: string;
  quantity: number;
  currentQuantity?: number;
  minimumQuantity?: number;
}

export interface RecipeIngredient {
  inventoryItemId: string;
  quantity: number;
}

export interface RecipeDocument extends TenantDocument {
  menuItemId?: string;
  name: LocalizedText;
  cost: number;
  recipeIngredients: RecipeIngredient[];
}

export interface ReviewDocument extends TenantDocument {
  orderId: string;
  rating: number;
  comment?: string;
}

export interface ComplaintDocument extends TenantDocument {
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  message: string;
  rating?: number;
  status: 'pending' | 'resolved';
}

export interface ExpenseDocument extends TenantDocument {
  title: string;
  amount: number;
  category: string;
  notes?: string;
}

export interface SupplierDocument extends TenantDocument {
  companyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
}

export interface StockTakeDocument extends TenantDocument {
  inventoryItemId: string;
  previousQuantity: number;
  countedQuantity: number;
  difference: number;
  notes?: string;
}

export interface WasteLogDocument extends TenantDocument {
  inventoryItemId?: string;
  orderId?: string;
  estimatedLoss: number;
  reason: string;
}
