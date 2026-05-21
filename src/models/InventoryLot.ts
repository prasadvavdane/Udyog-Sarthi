import mongoose, { Schema } from 'mongoose';
import type { InventoryLot } from '@/types/inventory';

const InventoryLotSchema = new Schema<InventoryLot>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    inventoryItemId: { type: String, required: true },
    locationId: { type: String, required: true },
    supplierId: { type: String },
    transactionId: { type: String, required: true },
    batchNumber: { type: String, trim: true },
    lotNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    purchaseDate: { type: Date },
    invoiceNumber: { type: String, trim: true },
    unitCost: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    quantityReceived: { type: Number, required: true, default: 0 },
    quantityAvailable: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['open', 'consumed', 'expired', 'cancelled'],
      default: 'open',
    },
  },
  {
    timestamps: true,
  },
);

InventoryLotSchema.index({ tenantId: 1, branchId: 1, inventoryItemId: 1, locationId: 1, status: 1 });
InventoryLotSchema.index({ tenantId: 1, branchId: 1, expiryDate: 1 });

export default mongoose.models.InventoryLot ||
  mongoose.model<InventoryLot>('InventoryLot', InventoryLotSchema);
