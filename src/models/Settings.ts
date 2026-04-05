import mongoose, { Schema } from 'mongoose';
import { Settings } from '@/types';

const SettingsSchema = new Schema<Settings>({
  tenantId: { type: String, required: true },
  businessId: { type: String, required: true },
  branchId: { type: String, required: true },
  createdBy: { type: String, required: true },
  businessName: { type: String, required: true },
  GSTIN: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  logo: { type: String },
  GSTSlabs: [{ type: Number }],
  defaultGST: { type: Number, default: 18 },
  currency: { type: String, default: 'INR' },
  invoicePrefix: { type: String, default: 'INV' },
  loyaltyPointsPerRupee: { type: Number, default: 0.01 }, // 1 point per 100 rupees
  industryTemplate: {
    type: String,
    enum: ['restaurant', 'medical-store', 'grocery', 'salon', 'retail', 'general-store', 'service-business'],
    default: 'retail',
  },
}, {
  timestamps: true,
});

// Ensure only one settings document per tenant
SettingsSchema.index({ tenantId: 1 }, { unique: true });

export default mongoose.models.Settings || mongoose.model<Settings>('Settings', SettingsSchema);
