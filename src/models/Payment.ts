import mongoose, { Schema } from 'mongoose';
import { Payment } from '@/types';

const PaymentSchema = new Schema<Payment>({
  tenantId: { type: String, required: true },
  businessId: { type: String, required: true },
  branchId: { type: String, required: true },
  createdBy: { type: String, required: true },
  invoiceId: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMode: {
    type: String,
    enum: ['cash', 'upi', 'card', 'qr'],
    required: true
  },
  transactionId: { type: String },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Indexes
PaymentSchema.index({ tenantId: 1, invoiceId: 1 });
PaymentSchema.index({ tenantId: 1, status: 1 });

export default mongoose.models.Payment || mongoose.model<Payment>('Payment', PaymentSchema);