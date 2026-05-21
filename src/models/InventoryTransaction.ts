import mongoose, { Schema } from 'mongoose';
import type {
  InventoryTransaction,
  InventoryTransactionLine,
  InventoryTransactionLineAllocation,
} from '@/types/inventory';

const InventoryTransactionLineAllocationSchema = new Schema<InventoryTransactionLineAllocation>(
  {
    lotId: { type: String, required: true },
    batchNumber: { type: String, trim: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true, default: 0 },
    expiryDate: { type: Date },
  },
  { _id: false },
);

const InventoryTransactionLineSchema = new Schema<InventoryTransactionLine>(
  {
    inventoryItemId: { type: String, required: true },
    itemName: { type: String, required: true },
    unitId: { type: String, required: true },
    locationId: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    batchNumber: { type: String, trim: true },
    lotNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    purchaseDate: { type: Date },
    invoiceNumber: { type: String, trim: true },
    reason: { type: String, trim: true },
    productId: { type: String },
    productName: { type: String },
    allocations: { type: [InventoryTransactionLineAllocationSchema], default: [] },
  },
  { _id: false },
);

const InventoryTransactionSchema = new Schema<InventoryTransaction>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    movementNumber: { type: String, required: true },
    movementDate: { type: Date, required: true, default: Date.now },
    direction: { type: String, enum: ['in', 'out'], required: true },
    movementType: {
      type: String,
      enum: [
        'manual-in',
        'purchase-grn',
        'supplier-receipt',
        'correction-in',
        'kitchen-consumption',
        'branch-issue',
        'damage',
        'wastage',
        'spoilage',
        'vendor-return',
        'manual-adjustment',
        'sale',
        'reversal',
      ],
      required: true,
    },
    status: { type: String, enum: ['posted', 'cancelled'], default: 'posted' },
    reason: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    sourceModule: { type: String, enum: ['inventory', 'billing', 'purchase', 'system'], default: 'inventory' },
    supplierId: { type: String },
    fromLocationId: { type: String },
    toLocationId: { type: String },
    referenceType: { type: String, trim: true },
    referenceId: { type: String, trim: true },
    relatedTransactionId: { type: String },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    cancelledBy: { type: String },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true },
    totalQuantity: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    lines: { type: [InventoryTransactionLineSchema], default: [] },
  },
  {
    timestamps: true,
  },
);

InventoryTransactionSchema.index({ tenantId: 1, branchId: 1, movementNumber: 1 }, { unique: true });
InventoryTransactionSchema.index({ tenantId: 1, branchId: 1, movementDate: -1 });
InventoryTransactionSchema.index({ tenantId: 1, branchId: 1, movementType: 1 });
InventoryTransactionSchema.index({ tenantId: 1, branchId: 1, status: 1 });

export default mongoose.models.InventoryTransaction ||
  mongoose.model<InventoryTransaction>('InventoryTransaction', InventoryTransactionSchema);
