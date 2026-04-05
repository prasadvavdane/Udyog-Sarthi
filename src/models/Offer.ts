import mongoose, { Schema } from 'mongoose';
import { Offer } from '@/types';

const OfferSchema = new Schema<Offer>({
  tenantId: { type: String, required: true },
  businessId: { type: String, required: true },
  branchId: { type: String, required: true },
  createdBy: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['flat', 'percentage', 'product', 'category', 'combo', 'coupon'],
    required: true
  },
  value: { type: Number, required: true },
  minOrder: { type: Number },
  applicableProducts: [{ type: String }],
  applicableCategories: [{ type: String }],
  active: { type: Boolean, default: true },
  expiryDate: { type: Date },
}, {
  timestamps: true,
});

// Indexes
OfferSchema.index({ tenantId: 1, active: 1 });
OfferSchema.index({ tenantId: 1, type: 1 });

export default mongoose.models.Offer || mongoose.model<Offer>('Offer', OfferSchema);