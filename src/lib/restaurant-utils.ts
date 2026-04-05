import type { CustomerEntryInput } from '@/lib/validations';
import type { InvoiceCustomerSnapshot } from '@/types';

type ProductLike = {
  _id: { toString(): string };
  productName: string;
  category: string;
  sellingPrice: number;
  GSTPercentage: number;
  foodType: 'veg' | 'non-veg';
};

type DraftItem = {
  productId: string;
  quantity: number;
};

export function createSessionId(tableName: string) {
  return `${tableName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
}

export function createDraftId(tableName: string) {
  return `DRF-${tableName.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`;
}

export function createInvoiceNumber(prefix: string) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${prefix}-${yyyy}${mm}${dd}-${random}`;
}

export function buildInvoiceItems(items: DraftItem[], products: ProductLike[]) {
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  return items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Product not found for line item ${item.productId}`);
    }

    const total = Number(product.sellingPrice) * item.quantity;
    const GSTAmount = (total * Number(product.GSTPercentage)) / 100;

    return {
      productId: product._id.toString(),
      productName: product.productName,
      quantity: item.quantity,
      price: Number(product.sellingPrice),
      GSTPercentage: Number(product.GSTPercentage),
      GSTAmount,
      total,
      category: product.category,
      foodType: product.foodType,
    };
  });
}

export function buildGstBreakup(items: Array<{ total: number; GSTPercentage: number }>) {
  return items.reduce(
    (accumulator, item) => {
      const gstAmount = (item.total * item.GSTPercentage) / 100;
      accumulator.CGST += gstAmount / 2;
      accumulator.SGST += gstAmount / 2;
      return accumulator;
    },
    { CGST: 0, SGST: 0, IGST: 0 },
  );
}

export function calculateInvoiceTotals(items: Array<{ total: number; GSTAmount: number }>, discount = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const GSTAmount = items.reduce((sum, item) => sum + item.GSTAmount, 0);
  const grandTotal = Math.max(subtotal + GSTAmount - discount, 0);

  return { subtotal, GSTAmount, grandTotal };
}

export function buildCustomerSnapshot(input?: CustomerEntryInput, customerId?: string): InvoiceCustomerSnapshot | undefined {
  if (!input) {
    return undefined;
  }

  return {
    customerId,
    customerName: input.customerName,
    mobileNumber: input.mobileNumber,
    email: input.email || undefined,
    numberOfGuests: input.numberOfGuests,
    specialNotes: input.specialNotes || undefined,
  };
}

export function getInvoiceFileName(invoice: {
  invoiceNumber: string;
  tableName?: string;
  customerSnapshot?: { customerName?: string };
}) {
  const customerName = invoice.customerSnapshot?.customerName?.trim();
  const tableName = invoice.tableName?.trim();

  if (customerName && tableName) {
    return `${customerName.replace(/\s+/g, '-')}-${tableName.replace(/\s+/g, '-')}.pdf`;
  }

  return `${invoice.invoiceNumber}.pdf`;
}
