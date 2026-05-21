import mongoose, { Schema } from 'mongoose';
import type { InventoryRecipe, InventoryRecipeLine } from '@/types/inventory';

const InventoryRecipeLineSchema = new Schema<InventoryRecipeLine>(
  {
    inventoryItemId: { type: String, required: true },
    quantity: { type: Number, required: true },
    wastagePercent: { type: Number, default: 0 },
    notes: { type: String, trim: true },
  },
  { _id: false },
);

const InventoryRecipeSchema = new Schema<InventoryRecipe>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    productId: { type: String, required: true },
    yieldQuantity: { type: Number, required: true, default: 1 },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lines: { type: [InventoryRecipeLineSchema], default: [] },
  },
  {
    timestamps: true,
  },
);

InventoryRecipeSchema.index({ tenantId: 1, branchId: 1, productId: 1 }, { unique: true });
InventoryRecipeSchema.index({ tenantId: 1, branchId: 1, isActive: 1 });

export default mongoose.models.InventoryRecipe ||
  mongoose.model<InventoryRecipe>('InventoryRecipe', InventoryRecipeSchema);
