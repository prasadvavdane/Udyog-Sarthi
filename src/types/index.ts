export interface BaseDocument {
  tenantId: string;
  businessId: string;
  branchId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BusinessTemplate =
  | 'restaurant'
  | 'medical-store'
  | 'grocery'
  | 'salon'
  | 'retail'
  | 'general-store'
  | 'service-business';

export type FoodType = 'veg' | 'non-veg';
export type TableStatus = 'available' | 'occupied' | 'billed' | 'reserved';
export type InvoiceStatus = 'draft' | 'active' | 'paid' | 'closed';

export interface User extends BaseDocument {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'super-admin' | 'business-admin' | 'billing-staff';
  isActive: boolean;
  lastLogin?: Date;
}

export interface Product extends BaseDocument {
  _id: string;
  productName: string;
  SKU: string;
  barcode?: string;
  HSN_SAC: string;
  category: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  GSTPercentage: number;
  description?: string;
  imageUrl?: string;
  foodType: FoodType;
  isAvailable: boolean;
  expiryDate?: Date;
  batchNumber?: string;
  activeStatus: boolean;
}

export interface Inventory extends BaseDocument {
  _id: string;
  productId: string;
  quantity: number;
  type: 'in' | 'out';
  reason: string;
  reference?: string; // invoice id or adjustment note
}

export interface Invoice extends BaseDocument {
  _id: string;
  invoiceNumber: string;
  invoiceDraftId: string;
  tableId: string;
  tableName: string;
  sessionId: string;
  customerId?: string;
  customerSnapshot?: InvoiceCustomerSnapshot;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  GSTAmount: number;
  grandTotal: number;
  invoiceStatus: InvoiceStatus;
  paymentStatus: 'pending' | 'paid' | 'partial';
  paymentMode?: string;
  notes?: string;
  GSTBreakup: GSTBreakup;
  closedAt?: Date;
  printedAt?: Date;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  GSTPercentage: number;
  GSTAmount: number;
  total: number;
  category?: string;
  foodType?: FoodType;
}

export interface InvoiceCustomerSnapshot {
  customerId?: string;
  customerName: string;
  mobileNumber: string;
  email?: string;
  numberOfGuests?: number;
  specialNotes?: string;
}

export interface GSTBreakup {
  CGST: number;
  SGST: number;
  IGST: number;
}

export interface Customer extends BaseDocument {
  _id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  birthday?: Date;
  numberOfGuests?: number;
  specialNotes?: string;
  loyaltyPoints: number;
  totalSpend: number;
  lastVisitDate?: Date;
  GSTIN?: string;
}

export interface Loyalty extends BaseDocument {
  _id: string;
  customerId: string;
  points: number;
  type: 'earned' | 'redeemed';
  reference: string; // invoice id
  expiryDate?: Date;
}

export interface Offer extends BaseDocument {
  _id: string;
  name: string;
  type: 'flat' | 'percentage' | 'product' | 'category' | 'combo' | 'coupon';
  value: number;
  minOrder?: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  active: boolean;
  expiryDate?: Date;
}

export interface Payment extends BaseDocument {
  _id: string;
  invoiceId: string;
  amount: number;
  paymentMode: 'cash' | 'upi' | 'card' | 'qr';
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
}

export interface Report extends BaseDocument {
  _id: string;
  type: 'sales' | 'gst' | 'inventory' | 'profit' | 'customer';
  data: Record<string, unknown>;
  generatedAt: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface Settings extends BaseDocument {
  _id: string;
  businessName: string;
  GSTIN: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  footerMessage?: string;
  thankYouNote?: string;
  GSTSlabs: number[];
  defaultGST: number;
  currency: string;
  invoicePrefix: string;
  loyaltyPointsPerRupee: number;
  industryTemplate: BusinessTemplate;
}

export interface RestaurantTable extends BaseDocument {
  _id: string;
  tableName: string;
  status: TableStatus;
  capacity?: number;
  isActive: boolean;
  sessionId?: string;
  activeInvoiceDraftId?: string;
  lastInvoiceId?: string;
  notes?: string;
}

export interface Tenant {
  _id: string;
  name: string;
  email: string;
  tenantCode: string;
  industry: BusinessTemplate;
  subscriptionPlan: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
