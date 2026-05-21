export type InventoryMovementDirection = 'in' | 'out';

export type InventoryTransactionStatus = 'posted' | 'cancelled';

export type InventoryMovementType =
  | 'manual-in'
  | 'purchase-grn'
  | 'supplier-receipt'
  | 'correction-in'
  | 'kitchen-consumption'
  | 'branch-issue'
  | 'damage'
  | 'wastage'
  | 'spoilage'
  | 'vendor-return'
  | 'manual-adjustment'
  | 'sale'
  | 'reversal';

export type InventoryEntityType =
  | 'category'
  | 'unit'
  | 'supplier'
  | 'location'
  | 'item'
  | 'recipe'
  | 'transaction';

export type InventoryAuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'post'
  | 'cancel'
  | 'reverse'
  | 'replace'
  | 'approve';

export type InventorySourceModule = 'inventory' | 'billing' | 'purchase' | 'system';

export interface InventoryCategory {
  _id: string;
  tenantId: string;
  businessId: string;
  branchId: string;
  createdBy: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryUnit {
  _id: string;
  tenantId: string;
  businessId: string;
  branchId: string;
  createdBy: string;
  name: string;
  code: string;
  precision: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventorySupplier {
  _id: string;
  tenantId: string;
  businessId: string;
  branchId: string;
  createdBy: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryLocation {
  _id: string;
  tenantId: string;
  businessId: string;
  branchId: string;
  createdBy: string;
  name: string;
  code: string;
  description?: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryLocationBalance {
  locationId: string;
  quantity: number;
}

export interface InventoryItem {
  _id: string;
  tenantId: string;
  businessId: string;
  branchId: string;
  createdBy: string;
  itemName: string;
  itemCode: string;
  categoryId: string;
  unitId: string;
  defaultSupplierId?: string;
  defaultLocationId: string;
  reorderLevel: number;
  reorderQuantity: number;
  currentStock: number;
  stockByLocation: InventoryLocationBalance[];
  averageCost: number;
  lastPurchaseCost: number;
  lastPurchaseDate?: Date;
  expiryTracked: boolean;
  batchTracked: boolean;
  allowNegativeStock: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryLot {
  _id: string;
  tenantId: string;
  businessId: string;
  branchId: string;
  createdBy: string;
  inventoryItemId: string;
  locationId: string;
  supplierId?: string;
  transactionId: string;
  batchNumber?: string;
  lotNumber?: string;
  expiryDate?: Date;
  purchaseDate?: Date;
  invoiceNumber?: string;
  unitCost: number;
  totalAmount: number;
  quantityReceived: number;
  quantityAvailable: number;
  status: 'open' | 'consumed' | 'expired' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryTransactionLineAllocation {
  lotId: string;
  batchNumber?: string;
  quantity: number;
  unitCost: number;
  expiryDate?: Date;
}

export interface InventoryTransactionLine {
  inventoryItemId: string;
  itemName: string;
  unitId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
  batchNumber?: string;
  lotNumber?: string;
  expiryDate?: Date;
  purchaseDate?: Date;
  invoiceNumber?: string;
  reason?: string;
  productId?: string;
  productName?: string;
  allocations?: InventoryTransactionLineAllocation[];
}

export interface InventoryTransaction {
  _id: string;
  tenantId: string;
  businessId: string;
  branchId: string;
  createdBy: string;
  movementNumber: string;
  movementDate: Date;
  direction: InventoryMovementDirection;
  movementType: InventoryMovementType;
  status: InventoryTransactionStatus;
  reason: string;
  notes?: string;
  sourceModule: InventorySourceModule;
  supplierId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  referenceType?: string;
  referenceId?: string;
  relatedTransactionId?: string;
  approvedBy?: string;
  approvedAt?: Date;
  cancelledBy?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  totalQuantity: number;
  totalAmount: number;
  lines: InventoryTransactionLine[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryRecipeLine {
  inventoryItemId: string;
  quantity: number;
  wastagePercent?: number;
  notes?: string;
}

export interface InventoryRecipe {
  _id: string;
  tenantId: string;
  businessId: string;
  branchId: string;
  createdBy: string;
  productId: string;
  yieldQuantity: number;
  notes?: string;
  isActive: boolean;
  lines: InventoryRecipeLine[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryAuditLog {
  _id: string;
  tenantId: string;
  businessId: string;
  branchId: string;
  createdBy: string;
  entityType: InventoryEntityType;
  entityId: string;
  action: InventoryAuditAction;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  referenceId?: string;
  createdAt: Date;
  updatedAt: Date;
}
