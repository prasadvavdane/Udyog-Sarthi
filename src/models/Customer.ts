import mongoose, { Schema } from 'mongoose';
import { Customer } from '@/types';

const CustomerSchema = new Schema<Customer>({
  tenantId: { type: String, required: true },
  businessId: { type: String, required: true },
  branchId: { type: String, required: true },
  createdBy: { type: String, required: true },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  birthday: { type: Date },
  loyaltyPoints: { type: Number, default: 0 },
  totalSpend: { type: Number, default: 0 },
  lastVisitDate: { type: Date },
  GSTIN: { type: String },
}, {
  timestamps: true,
});

// Indexes
CustomerSchema.index({ tenantId: 1, mobile: 1 });
CustomerSchema.index({ tenantId: 1, email: 1 });
CustomerSchema.index({ tenantId: 1, loyaltyPoints: -1 });

export default mongoose.models.Customer || mongoose.model<Customer>('Customer', CustomerSchema);