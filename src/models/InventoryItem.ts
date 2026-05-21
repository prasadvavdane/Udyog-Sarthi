import mongoose, { Schema } from 'mongoose';
import type { InventoryItem, InventoryLocationBalance } from '@/types/inventory';

const InventoryLocationBalanceSchema = new Schema<InventoryLocationBalance>(
  {
    locationId: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const InventoryItemSchema = new Schema<InventoryItem>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    itemName: { type: String, required: true, trim: true },
    itemCode: { type: String, required: true, trim: true, uppercase: true },
    categoryId: { type: String, required: true },
    unitId: { type: String, required: true },
    defaultSupplierId: { type: String },
    defaultLocationId: { type: String, required: true },
    reorderLevel: { type: Number, required: true, default: 0 },
    reorderQuantity: { type: Number, required: true, default: 0 },
    currentStock: { type: Number, required: true, default: 0 },
    stockByLocation: { type: [InventoryLocationBalanceSchema], default: [] },
    averageCost: { type: Number, required: true, default: 0 },
    lastPurchaseCost: { type: Number, required: true, default: 0 },
    lastPurchaseDate: { type: Date },
    expiryTracked: { type: Boolean, default: false },
    batchTracked: { type: Boolean, default: true },
    allowNegativeStock: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  },
);

InventoryItemSchema.index({ tenantId: 1, branchId: 1, itemCode: 1 }, { unique: true });
InventoryItemSchema.index({ tenantId: 1, branchId: 1, itemName: 1 });
InventoryItemSchema.index({ tenantId: 1, branchId: 1, categoryId: 1 });
InventoryItemSchema.index({ tenantId: 1, branchId: 1, currentStock: 1 });

export default mongoose.models.InventoryItem ||
  mongoose.model<InventoryItem>('InventoryItem', InventoryItemSchema);
