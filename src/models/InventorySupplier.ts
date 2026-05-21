import mongoose, { Schema } from 'mongoose';
import type { InventorySupplier } from '@/types/inventory';

const InventorySupplierSchema = new Schema<InventorySupplier>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    gstin: { type: String, trim: true, uppercase: true },
    address: { type: String, trim: true },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

InventorySupplierSchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });
InventorySupplierSchema.index({ tenantId: 1, branchId: 1, isActive: 1 });

export default mongoose.models.InventorySupplier ||
  mongoose.model<InventorySupplier>('InventorySupplier', InventorySupplierSchema);
