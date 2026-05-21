import mongoose, { Schema } from 'mongoose';
import type { InventoryCategory } from '@/types/inventory';

const InventoryCategorySchema = new Schema<InventoryCategory>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

InventoryCategorySchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });
InventoryCategorySchema.index({ tenantId: 1, branchId: 1, isActive: 1 });

export default mongoose.models.InventoryCategory ||
  mongoose.model<InventoryCategory>('InventoryCategory', InventoryCategorySchema);
