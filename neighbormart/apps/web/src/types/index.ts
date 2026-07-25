export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'CUSTOMER' | 'DRIVER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type StaffPosition = 'CASHIER' | 'STOCK' | 'SUPERVISOR' | 'DELI' | 'BAKER';
export type ShiftType = 'MORNING' | 'EVENING' | 'FULL_DAY' | 'SPLIT';
export type StorageType = 'AMBIENT' | 'REFRIGERATED' | 'FROZEN';
export type ProductStatus = 'ACTIVE' | 'DISCONTINUED';
export type POStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'PARTIAL' | 'CANCELLED';
export type WasteReason = 'EXPIRED' | 'DAMAGED' | 'STOLEN' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  storeId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  photo?: string;
  status: UserStatus;
  mfaEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  city?: string;
  country: string;
  currency: string;
  timezone: string;
  lowStockThreshold: number;
  salesGoal: number;
  status: string;
}

export interface Staff {
  id: string;
  userId: string;
  storeId: string;
  employeeId: string;
  position: StaffPosition;
  shiftType: ShiftType;
  dateJoined: string;
  notes?: string;
  status: UserStatus;
  user: User;
}

export interface Manager {
  id: string;
  userId: string;
  storeId: string;
  permissions: Record<string, boolean>;
  status: UserStatus;
  user: User;
}

export interface Brand {
  id: string;
  storeId: string;
  name: string;
  logo?: string;
  _count?: { products: number };
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  icon?: string;
  image?: string;
  parentId?: string;
  sortOrder: number;
  children?: Category[];
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  brandId?: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  taxRate: number;
  stockQty: number;
  lowStockThreshold: number;
  storageType: StorageType;
  aisle?: string;
  shelfNumber?: string;
  shelfRow?: string;
  countryOfOrigin?: string;
  isPerishable: boolean;
  isOrganic: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isHalal: boolean;
  isKosher: boolean;
  unitOfMeasure: string;
  packSize: number;
  packageType?: string;
  isRecyclable: boolean;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  brand?: Brand;
  images?: ProductImage[];
  variants?: ProductVariant[];
  nutrition?: ProductNutrition;
  allergens?: ProductAllergen[];
  dietaryTags?: ProductDietaryTag[];
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  sellingPrice: number;
  stockQty: number;
  unit?: string;
}

export interface ProductNutrition {
  id: string;
  calories?: number;
  fat?: number;
  protein?: number;
  carbs?: number;
  sugar?: number;
  fiber?: number;
  sodium?: number;
  servingSize?: string;
  servingsPerPack?: number;
  ingredients?: string;
}

export interface ProductAllergen { id: string; allergen: string; }
export interface ProductDietaryTag { id: string; tag: string; }

export interface Supplier {
  id: string;
  storeId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  leadTimeDays: number;
  rating: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  storeId: string;
  supplierId: string;
  status: POStatus;
  expectedDate?: string;
  notes?: string;
  createdAt: string;
  supplier?: Supplier;
  items?: POItem[];
}

export interface POItem {
  id: string;
  poId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  receivedQty: number;
  product?: Product;
}

export interface Shift {
  id: string;
  storeId: string;
  staffId: string;
  date: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  status: string;
  staff?: Staff;
}

export interface Attendance {
  id: string;
  staffId: string;
  shiftId?: string;
  clockIn?: string;
  clockOut?: string;
  date: string;
  status: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  dateFrom: string;
  dateTo: string;
  reason?: string;
  status: LeaveStatus;
  approvedBy?: string;
  createdAt: string;
  staff?: Staff;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  module: string;
  recordId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  createdAt: string;
  user?: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryOverview {
  totalSKUs: number;
  stockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringThisWeek: number;
  wasteThisMonth: number;
  stockHealthDonut: { inStock: number; lowStock: number; outOfStock: number };
  categoryStockChart: Array<{ category: string; totalQty: number; value: number }>;
}

export interface OwnerDashboard {
  revenueToday: number;
  ordersToday: number;
  totalProducts: number;
  staffOnlineNow: number;
  lowStockItems: number;
  wasteToday: number;
  revenueChart: Array<{ date: string; value: number }>;
  topProducts: Product[];
  inventoryHealth: { inStock: number; lowStock: number; outOfStock: number };
  staffOnlineList: Array<{ id: string; name: string; photo?: string; position: string }>;
  salesGoalProgress: { goal: number; current: number; percentage: number };
  recentActivity: AuditLog[];
  alerts: {
    critical: Product[];
    warning: Array<Product | unknown>;
    info: unknown[];
  };
}
