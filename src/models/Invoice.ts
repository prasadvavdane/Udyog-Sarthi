import mongoose, { Schema } from 'mongoose';
import { Invoice } from '@/types';

const InvoiceItemSchema = new Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  GSTPercentage: { type: Number, required: true },
  GSTAmount: { type: Number, required: true },
  total: { type: Number, required: true },
}, { _id: false });

const GSTBreakupSchema = new Schema({
  CGST: { type: Number, required: true },
  SGST: { type: Number, required: true },
  IGST: { type: Number, required: true },
}, { _id: false });

const InvoiceSchema = new Schema<Invoice>({
  tenantId: { type: String, required: true },
  businessId: { type: String, required: true },
  branchId: { type: String, required: true },
  createdBy: { type: String, required: true },
  invoiceNumber: { type: String, required: true },
  customerId: { type: String },
  items: [InvoiceItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  GSTAmount: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial'],
    default: 'pending'
  },
  paymentMode: { type: String },
  notes: { type: String },
  GSTBreakup: GSTBreakupSchema,
}, {
  timestamps: true,
});

// Indexes
InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 });
InvoiceSchema.index({ tenantId: 1, createdAt: -1 });
InvoiceSchema.index({ tenantId: 1, paymentStatus: 1 });
InvoiceSchema.index({ tenantId: 1, customerId: 1 });

export default mongoose.models.Invoice || mongoose.model<Invoice>('Invoice', InvoiceSchema);