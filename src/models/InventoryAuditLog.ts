import mongoose, { Schema } from 'mongoose';
import type { InventoryAuditLog } from '@/types/inventory';

const InventoryAuditLogSchema = new Schema<InventoryAuditLog>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    entityType: {
      type: String,
      enum: ['category', 'unit', 'supplier', 'location', 'item', 'recipe', 'transaction'],
      required: true,
    },
    entityId: { type: String, required: true },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'post', 'cancel', 'reverse', 'replace', 'approve'],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    referenceId: { type: String },
  },
  {
    timestamps: true,
  },
);

InventoryAuditLogSchema.index({ tenantId: 1, branchId: 1, entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.models.InventoryAuditLog ||
  mongoose.model<InventoryAuditLog>('InventoryAuditLog', InventoryAuditLogSchema);
