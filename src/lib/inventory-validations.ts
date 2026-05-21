import { z } from 'zod';

export const inventoryMasterResourceSchema = z.enum(['category', 'unit', 'supplier', 'location', 'item']);

export const inventoryCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name is required'),
  description: z.string().trim().max(240).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const inventoryUnitSchema = z.object({
  name: z.string().trim().min(1, 'Unit name is required'),
  code: z.string().trim().min(1, 'Unit code is required').max(8),
  precision: z.coerce.number().int().min(0).max(4).default(2),
  isActive: z.boolean().default(true),
});

export const inventorySupplierSchema = z.object({
  name: z.string().trim().min(2, 'Supplier name is required'),
  contactPerson: z.string().trim().max(80).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  email: z.string().trim().email('Supplier email must be valid').optional().or(z.literal('')),
  gstin: z.string().trim().max(20).optional().or(z.literal('')),
  address: z.string().trim().max(240).optional().or(z.literal('')),
  notes: z.string().trim().max(240).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const inventoryLocationSchema = z.object({
  name: z.string().trim().min(2, 'Location name is required'),
  code: z.string().trim().min(1, 'Location code is required').max(12),
  description: z.string().trim().max(240).optional().or(z.literal('')),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const inventoryItemSchema = z.object({
  itemName: z.string().trim().min(2, 'Item name is required'),
  itemCode: z.string().trim().max(24).optional().or(z.literal('')),
  categoryId: z.string().trim().min(1, 'Category is required'),
  unitId: z.string().trim().min(1, 'Unit is required'),
  defaultSupplierId: z.string().trim().optional().or(z.literal('')),
  defaultLocationId: z.string().trim().min(1, 'Default location is required'),
  reorderLevel: z.coerce.number().min(0).default(0),
  reorderQuantity: z.coerce.number().min(0).default(0),
  averageCost: z.coerce.number().min(0).default(0),
  lastPurchaseCost: z.coerce.number().min(0).default(0),
  expiryTracked: z.boolean().default(false),
  batchTracked: z.boolean().default(true),
  allowNegativeStock: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(240).optional().or(z.literal('')),
});

export const inventoryTransactionLineSchema = z.object({
  inventoryItemId: z.string().trim().min(1, 'Inventory item is required'),
  locationId: z.string().trim().min(1, 'Location is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be 0 or above').default(0),
  batchNumber: z.string().trim().max(40).optional().or(z.literal('')),
  lotNumber: z.string().trim().max(40).optional().or(z.literal('')),
  expiryDate: z.string().trim().optional().or(z.literal('')),
  purchaseDate: z.string().trim().optional().or(z.literal('')),
  invoiceNumber: z.string().trim().max(60).optional().or(z.literal('')),
  reason: z.string().trim().max(160).optional().or(z.literal('')),
  productId: z.string().trim().optional().or(z.literal('')),
  productName: z.string().trim().max(120).optional().or(z.literal('')),
});

export const inventoryTransactionSchema = z.object({
  movementDate: z.string().trim().optional().or(z.literal('')),
  direction: z.enum(['in', 'out']),
  movementType: z.enum([
    'manual-in',
    'purchase-grn',
    'supplier-receipt',
    'correction-in',
    'kitchen-consumption',
    'branch-issue',
    'damage',
    'wastage',
    'spoilage',
    'vendor-return',
    'manual-adjustment',
    'sale',
    'reversal',
  ]),
  reason: z.string().trim().min(2, 'Reason is required'),
  notes: z.string().trim().max(320).optional().or(z.literal('')),
  supplierId: z.string().trim().optional().or(z.literal('')),
  fromLocationId: z.string().trim().optional().or(z.literal('')),
  toLocationId: z.string().trim().optional().or(z.literal('')),
  referenceType: z.string().trim().max(40).optional().or(z.literal('')),
  referenceId: z.string().trim().max(80).optional().or(z.literal('')),
  sourceModule: z.enum(['inventory', 'billing', 'purchase', 'system']).default('inventory'),
  lines: z.array(inventoryTransactionLineSchema).min(1, 'At least one item is required'),
});

export const inventoryTransactionActionSchema = z.object({
  action: z.enum(['cancel', 'replace']),
  id: z.string().trim().min(1, 'Transaction id is required'),
  reason: z.string().trim().min(2, 'Reason is required'),
  replacement: inventoryTransactionSchema.optional(),
});

export const inventoryRecipeLineSchema = z.object({
  inventoryItemId: z.string().trim().min(1, 'Inventory item is required'),
  quantity: z.coerce.number().positive('Ingredient quantity must be greater than zero'),
  wastagePercent: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().trim().max(160).optional().or(z.literal('')),
});

export const inventoryRecipeSchema = z.object({
  productId: z.string().trim().min(1, 'Menu item is required'),
  yieldQuantity: z.coerce.number().positive('Yield quantity must be greater than zero').default(1),
  notes: z.string().trim().max(240).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  lines: z.array(inventoryRecipeLineSchema).min(1, 'At least one recipe ingredient is required'),
});

export const inventoryReportTypeSchema = z.enum([
  'stock-on-hand',
  'low-stock-items',
  'expiry-alerts',
  'purchase-history',
  'consumption-report',
  'wastage-report',
  'stock-valuation',
  'supplier-purchases',
  'inventory-movement',
]);

export const inventoryReportFiltersSchema = z.object({
  reportType: inventoryReportTypeSchema,
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  format: z.enum(['json', 'pdf', 'csv', 'excel']).optional(),
});

export type InventoryCategoryInput = z.infer<typeof inventoryCategorySchema>;
export type InventoryUnitInput = z.infer<typeof inventoryUnitSchema>;
export type InventorySupplierInput = z.infer<typeof inventorySupplierSchema>;
export type InventoryLocationInput = z.infer<typeof inventoryLocationSchema>;
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
export type InventoryTransactionInput = z.infer<typeof inventoryTransactionSchema>;
export type InventoryRecipeInput = z.infer<typeof inventoryRecipeSchema>;
