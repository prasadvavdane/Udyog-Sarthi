import mongoose, { Schema } from 'mongoose';
import { Loyalty } from '@/types';

const LoyaltySchema = new Schema<Loyalty>({
  tenantId: { type: String, required: true },
  businessId: { type: String, required: true },
  branchId: { type: String, required: true },
  createdBy: { type: String, required: true },
  customerId: { type: String, required: true },
  points: { type: Number, required: true },
  type: { type: String, enum: ['earned', 'redeemed'], required: true },
  reference: { type: String, required: true },
  expiryDate: { type: Date },
}, {
  timestamps: true,
});

// Indexes
LoyaltySchema.index({ tenantId: 1, customerId: 1 });
LoyaltySchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.models.Loyalty || mongoose.model<Loyalty>('Loyalty', LoyaltySchema);