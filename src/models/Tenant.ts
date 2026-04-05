import mongoose, { Schema } from 'mongoose';
import { Tenant } from '@/types';

const TenantSchema = new Schema<Tenant>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  tenantCode: { type: String, required: true, unique: true },
  industry: {
    type: String,
    enum: ['restaurant', 'medical-store', 'grocery', 'salon', 'retail', 'general-store', 'service-business'],
    default: 'retail',
  },
  subscriptionPlan: { type: String, default: 'free' },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

export default mongoose.models.Tenant || mongoose.model<Tenant>('Tenant', TenantSchema);
