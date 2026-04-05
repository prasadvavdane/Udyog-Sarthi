import mongoose, { Schema } from 'mongoose';
import { Product } from '@/types';

const ProductSchema = new Schema<Product>({
  tenantId: { type: String, required: true },
  businessId: { type: String, required: true },
  branchId: { type: String, required: true },
  createdBy: { type: String, required: true },
  productName: { type: String, required: true },
  SKU: { type: String, required: true },
  barcode: { type: String },
  HSN_SAC: { type: String, required: true },
  category: { type: String, required: true },
  buyingPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  stockQuantity: { type: Number, required: true, default: 0 },
  reorderLevel: { type: Number, required: true, default: 10 },
  GSTPercentage: { type: Number, required: true, default: 18 },
  expiryDate: { type: Date },
  batchNumber: { type: String },
  activeStatus: { type: Boolean, default: true },
}, {
  timestamps: true,
});

// Indexes
ProductSchema.index({ tenantId: 1, SKU: 1 });
ProductSchema.index({ tenantId: 1, category: 1 });
ProductSchema.index({ tenantId: 1, barcode: 1 });
ProductSchema.index({ tenantId: 1, activeStatus: 1 });

export default mongoose.models.Product || mongoose.model<Product>('Product', ProductSchema);