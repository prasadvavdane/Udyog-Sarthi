import mongoose, { Schema } from 'mongoose';
import { RestaurantTable } from '@/types';

const RestaurantTableSchema = new Schema<RestaurantTable>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    tableName: { type: String, required: true },
    status: {
      type: String,
      enum: ['available', 'occupied', 'billed', 'reserved'],
      default: 'available',
    },
    capacity: { type: Number, default: 4 },
    isActive: { type: Boolean, default: true },
    sessionId: { type: String },
    activeInvoiceDraftId: { type: String },
    lastInvoiceId: { type: String },
    notes: { type: String },
  },
  {
    timestamps: true,
  },
);

RestaurantTableSchema.index({ tenantId: 1, tableName: 1 }, { unique: true });
RestaurantTableSchema.index({ tenantId: 1, status: 1 });

export default mongoose.models.RestaurantTable || mongoose.model<RestaurantTable>('RestaurantTable', RestaurantTableSchema);
