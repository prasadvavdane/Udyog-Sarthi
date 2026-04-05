import mongoose, { Schema } from 'mongoose';
import { User } from '@/types';

const UserSchema = new Schema<User>({
  tenantId: { type: String, required: true },
  businessId: { type: String, required: true },
  branchId: { type: String, required: true },
  createdBy: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['super-admin', 'business-admin', 'billing-staff'],
    required: true
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
}, {
  timestamps: true,
});

// Index for multi-tenant queries
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1 });

export default mongoose.models.User || mongoose.model<User>('User', UserSchema);
