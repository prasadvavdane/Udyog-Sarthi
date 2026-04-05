import { z } from 'zod';

export const productSchema = z.object({
  productName: z.string().min(2, 'Product name is required'),
  category: z.string().min(2, 'Category is required'),
  price: z.coerce.number().min(0, 'Price must be 0 or above'),
  costPrice: z.coerce.number().min(0, 'Cost price must be 0 or above').default(0),
  stock: z.coerce.number().int().min(0, 'Stock must be 0 or above'),
  GST: z.coerce.number().min(0).max(28),
  description: z.string().optional().or(z.literal('')),
  imageUrl: z.string().url('Image must be a valid URL').optional().or(z.literal('')),
  activeStatus: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  foodType: z.enum(['veg', 'non-veg']),
  reorderLevel: z.coerce.number().int().min(0).default(5),
  SKU: z.string().optional().or(z.literal('')),
  barcode: z.string().optional().or(z.literal('')),
  HSN_SAC: z.string().min(2, 'HSN/SAC is required'),
});

export const customerEntrySchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  mobileNumber: z.string().min(8, 'Mobile number is required'),
  email: z.string().email('Email must be valid').optional().or(z.literal('')),
  numberOfGuests: z.coerce.number().int().min(1).max(50).optional(),
  specialNotes: z.string().max(240).optional().or(z.literal('')),
});

export const settingsSchema = z.object({
  businessName: z.string().min(2, 'Vendor name is required'),
  GSTIN: z.string().min(5, 'GSTIN is required'),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().min(8, 'Phone number is required'),
  email: z.string().email('Email must be valid'),
  logo: z.string().url('Logo must be a valid URL').optional().or(z.literal('')),
  footerMessage: z.string().max(160).optional().or(z.literal('')),
  thankYouNote: z.string().max(160).optional().or(z.literal('')),
  invoicePrefix: z.string().min(2).max(8),
  defaultGST: z.coerce.number().min(0).max(28),
});

export const tableSchema = z.object({
  tableName: z.string().min(2, 'Table name is required'),
  capacity: z.coerce.number().int().min(1).max(20).default(4),
  status: z.enum(['available', 'occupied', 'billed', 'reserved']).default('available'),
  notes: z.string().max(160).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const draftItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

export const draftInvoiceSchema = z.object({
  tableId: z.string().min(1),
  tableName: z.string().min(1),
  invoiceDraftId: z.string().optional(),
  sessionId: z.string().optional(),
  items: z.array(draftItemSchema).default([]),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().max(240).optional().or(z.literal('')),
  customer: customerEntrySchema.optional(),
  customerId: z.string().optional(),
});

export const finalizeInvoiceSchema = z.object({
  draftId: z.string().min(1),
  paymentMode: z.enum(['cash', 'upi', 'card']),
  paymentAmount: z.coerce.number().min(0).optional(),
});

export const reportFiltersSchema = z.object({
  reportType: z.enum([
    'daily-sales',
    'weekly-sales',
    'monthly-sales',
    'yearly-sales',
    'item-wise-sales',
    'table-wise-revenue',
    'customer-wise-revenue',
    'profit-report',
    'tax-report',
  ]),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  format: z.enum(['json', 'pdf', 'csv', 'excel']).optional(),
});

export function flattenZodError(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(', ');
}

export type ProductInput = z.infer<typeof productSchema>;
export type CustomerEntryInput = z.infer<typeof customerEntrySchema>;
export type DraftInvoiceInput = z.infer<typeof draftInvoiceSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type TableInput = z.infer<typeof tableSchema>;
