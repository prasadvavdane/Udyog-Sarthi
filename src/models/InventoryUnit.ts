import mongoose, { Schema } from 'mongoose';
import type { InventoryUnit } from '@/types/inventory';

const InventoryUnitSchema = new Schema<InventoryUnit>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    precision: { type: Number, required: true, default: 2 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

InventoryUnitSchema.index({ tenantId: 1, branchId: 1, code: 1 }, { unique: true });
InventoryUnitSchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });

export default mongoose.models.InventoryUnit ||
  mongoose.model<InventoryUnit>('InventoryUnit', InventoryUnitSchema);
