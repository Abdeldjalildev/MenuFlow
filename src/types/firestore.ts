/**
 * Canonical Firestore domain contracts.
 *
 * These types describe the approved target schema only. They do not migrate
 * existing data or grant client-side authorization.
 */

export type RestaurantId = string;

export const STAFF_ROLES = [
  'SuperAdmin',
  'Admin',
  'Cashier',
  'Kitchen',
  'Delivery',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export interface FirestoreTimestampLike {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

export type FirestoreDate = Date | FirestoreTimestampLike;

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
