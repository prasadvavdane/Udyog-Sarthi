import mongoose, { Schema } from 'mongoose';
import type { InventoryLocation } from '@/types/inventory';

const InventoryLocationSchema = new Schema<InventoryLocation>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

InventoryLocationSchema.index({ tenantId: 1, branchId: 1, code: 1 }, { unique: true });
InventoryLocationSchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });

export default mongoose.models.InventoryLocation ||
  mongoose.model<InventoryLocation>('InventoryLocation', InventoryLocationSchema);
