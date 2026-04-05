import mongoose, { Schema } from 'mongoose';
import { Invoice } from '@/types';

const InvoiceItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    GSTPercentage: { type: Number, required: true },
    GSTAmount: { type: Number, required: true },
    total: { type: Number, required: true },
    category: { type: String },
    foodType: { type: String, enum: ['veg', 'non-veg'] },
  },
  { _id: false },
);

const GSTBreakupSchema = new Schema(
  {
    CGST: { type: Number, required: true },
    SGST: { type: Number, required: true },
    IGST: { type: Number, required: true },
  },
  { _id: false },
);

const CustomerSnapshotSchema = new Schema(
  {
    customerId: { type: String },
    customerName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    email: { type: String },
    numberOfGuests: { type: Number },
    specialNotes: { type: String },
  },
  { _id: false },
);

const InvoiceSchema = new Schema<Invoice>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    invoiceDraftId: { type: String, required: true },
    tableId: { type: String, required: true },
    tableName: { type: String, required: true },
    sessionId: { type: String, required: true },
    customerId: { type: String },
    customerSnapshot: CustomerSnapshotSchema,
    items: [InvoiceItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    GSTAmount: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    invoiceStatus: {
      type: String,
      enum: ['draft', 'active', 'paid', 'closed'],
      default: 'draft',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial'],
      default: 'pending',
    },
    paymentMode: { type: String },
    notes: { type: String },
    GSTBreakup: { type: GSTBreakupSchema, required: true },
    closedAt: { type: Date },
    printedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ tenantId: 1, invoiceDraftId: 1 }, { unique: true });
InvoiceSchema.index({ tenantId: 1, tableId: 1, invoiceStatus: 1 });
InvoiceSchema.index({ tenantId: 1, createdAt: -1 });
InvoiceSchema.index({ tenantId: 1, paymentStatus: 1 });
InvoiceSchema.index({ tenantId: 1, customerId: 1 });

export default mongoose.models.Invoice || mongoose.model<Invoice>('Invoice', InvoiceSchema);
