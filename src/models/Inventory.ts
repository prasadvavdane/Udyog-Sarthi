import mongoose, { Schema } from 'mongoose';
import { Inventory } from '@/types';

const InventorySchema = new Schema<Inventory>({
  tenantId: { type: String, required: true },
  businessId: { type: String, required: true },
  branchId: { type: String, required: true },
  createdBy: { type: String, required: true },
  productId: { type: String, required: true },
  quantity: { type: Number, required: true },
  type: { type: String, enum: ['in', 'out'], required: true },
  reason: { type: String, required: true },
  reference: { type: String },
}, {
  timestamps: true,
});

// Indexes
InventorySchema.index({ tenantId: 1, productId: 1 });
InventorySchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.models.Inventory || mongoose.model<Inventory>('Inventory', InventorySchema);