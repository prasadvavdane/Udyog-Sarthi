function normalizeId(value: unknown) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return value.toString();
  }

  return String(value);
}

function normalizeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function normalizeFoodType(value: unknown): 'veg' | 'non-veg' {
  return value === 'non-veg' ? 'non-veg' : 'veg';
}

function normalizeTableStatus(value: unknown): 'available' | 'occupied' | 'billed' | 'reserved' {
  return value === 'occupied' || value === 'billed' || value === 'reserved' ? value : 'available';
}

function normalizeInvoiceStatus(value: unknown): 'draft' | 'active' | 'paid' | 'closed' {
  return value === 'active' || value === 'paid' || value === 'closed' ? value : 'draft';
}

function normalizePaymentStatus(value: unknown): 'pending' | 'paid' | 'partial' {
  return value === 'paid' || value === 'partial' ? value : 'pending';
}

function normalizePaymentMode(value: unknown): 'cash' | 'upi' | 'card' | 'qr' | '' {
  return value === 'cash' || value === 'upi' || value === 'card' || value === 'qr' ? value : '';
}

type UnknownRecord = {
  _id?: unknown;
  id?: unknown;
  [key: string]: unknown;
};

type InvoiceSnapshotRecord = UnknownRecord & {
  customerId?: unknown;
  customerName?: string;
  mobileNumber?: string;
  email?: string;
  numberOfGuests?: number;
  specialNotes?: string;
};

type InvoiceItemRecord = UnknownRecord & {
  productId?: unknown;
  productName?: string;
  quantity?: number;
  price?: number;
  GSTPercentage?: number;
  GSTAmount?: number;
  total?: number;
  category?: string;
  foodType?: 'veg' | 'non-veg';
};

type InvoiceRecord = UnknownRecord & {
  invoiceNumber?: string;
  invoiceDraftId?: string;
  tableId?: unknown;
  tableName?: string;
  sessionId?: string;
  customerId?: unknown;
  customerSnapshot?: InvoiceSnapshotRecord;
  items?: InvoiceItemRecord[];
  subtotal?: number;
  GSTAmount?: number;
  discount?: number;
  grandTotal?: number;
  invoiceStatus?: string;
  paymentStatus?: string;
  paymentMode?: string;
  notes?: string;
  GSTBreakup?: {
    CGST?: number;
    SGST?: number;
    IGST?: number;
  };
  closedAt?: unknown;
  printedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SerializedProduct = {
  id: string;
  _id: string;
  productName: string;
  category: string;
  sellingPrice: number;
  buyingPrice: number;
  stockQuantity: number;
  GSTPercentage: number;
  description: string;
  imageUrl: string;
  foodType: 'veg' | 'non-veg';
  activeStatus: boolean;
  isAvailable: boolean;
  reorderLevel: number;
  SKU: string;
  barcode: string;
  HSN_SAC: string;
  createdAt: unknown;
  updatedAt: unknown;
};

export type SerializedCustomer = {
  id: string;
  _id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  birthday: unknown;
  numberOfGuests?: number;
  specialNotes: string;
  loyaltyPoints: number;
  totalSpend: number;
  lastVisitDate: unknown;
  createdAt: unknown;
  updatedAt: unknown;
};

export type SerializedTable = {
  id: string;
  _id: string;
  tableName: string;
  status: 'available' | 'occupied' | 'billed' | 'reserved';
  capacity: number;
  sessionId: string;
  activeInvoiceDraftId: string;
  lastInvoiceId: string;
  notes: string;
  isActive: boolean;
  createdAt: unknown;
  updatedAt: unknown;
};

export type SerializedSettings = {
  id: string;
  _id: string;
  businessName: string;
  GSTIN: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
  footerMessage: string;
  thankYouNote: string;
  invoicePrefix: string;
  defaultGST: number;
  GSTSlabs: number[];
  industryTemplate: unknown;
  createdAt: unknown;
  updatedAt: unknown;
} | null;

export type SerializedInvoice = {
  id: string;
  _id: string;
  invoiceNumber: string;
  invoiceDraftId: string;
  tableId: string;
  tableName: string;
  sessionId: string;
  customerId: string;
  customerSnapshot?: {
    customerId: string;
    customerName: string;
    mobileNumber: string;
    email: string;
    numberOfGuests?: number;
    specialNotes: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    GSTPercentage: number;
    GSTAmount: number;
    total: number;
    category: string;
    foodType: 'veg' | 'non-veg';
  }>;
  subtotal: number;
  GSTAmount: number;
  discount: number;
  grandTotal: number;
  invoiceStatus: 'draft' | 'active' | 'paid' | 'closed';
  paymentStatus: 'pending' | 'paid' | 'partial';
  paymentMode: 'cash' | 'upi' | 'card' | 'qr' | '';
  notes: string;
  GSTBreakup: {
    CGST: number;
    SGST: number;
    IGST: number;
  };
  closedAt: string | Date | undefined;
  printedAt: string | Date | undefined;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export function serializeProduct(product: UnknownRecord): SerializedProduct {
  const id = normalizeId(product?._id ?? product?.id);

  return {
    id,
    _id: id,
    productName: normalizeString(product?.productName),
    category: normalizeString(product?.category),
    sellingPrice: normalizeNumber(product?.sellingPrice),
    buyingPrice: normalizeNumber(product?.buyingPrice),
    stockQuantity: normalizeNumber(product?.stockQuantity),
    GSTPercentage: normalizeNumber(product?.GSTPercentage),
    description: normalizeString(product?.description),
    imageUrl: normalizeString(product?.imageUrl),
    foodType: normalizeFoodType(product?.foodType),
    activeStatus: normalizeBoolean(product?.activeStatus),
    isAvailable: normalizeBoolean(product?.isAvailable),
    reorderLevel: normalizeNumber(product?.reorderLevel),
    SKU: normalizeString(product?.SKU),
    barcode: normalizeString(product?.barcode),
    HSN_SAC: normalizeString(product?.HSN_SAC),
    createdAt: product?.createdAt,
    updatedAt: product?.updatedAt,
  };
}

export function serializeCustomer(customer: UnknownRecord): SerializedCustomer {
  const id = normalizeId(customer?._id ?? customer?.id);

  return {
    id,
    _id: id,
    name: normalizeString(customer?.name),
    mobile: normalizeString(customer?.mobile),
    email: normalizeString(customer?.email),
    address: normalizeString(customer?.address),
    birthday: customer?.birthday,
    numberOfGuests:
      typeof customer?.numberOfGuests === 'number' ? customer.numberOfGuests : undefined,
    specialNotes: normalizeString(customer?.specialNotes),
    loyaltyPoints: normalizeNumber(customer?.loyaltyPoints),
    totalSpend: normalizeNumber(customer?.totalSpend),
    lastVisitDate: customer?.lastVisitDate,
    createdAt: customer?.createdAt,
    updatedAt: customer?.updatedAt,
  };
}

export function serializeTable(table: UnknownRecord): SerializedTable {
  const id = normalizeId(table?._id ?? table?.id);

  return {
    id,
    _id: id,
    tableName: normalizeString(table?.tableName),
    status: normalizeTableStatus(table?.status),
    capacity: normalizeNumber(table?.capacity, 4),
    sessionId: normalizeString(table?.sessionId),
    activeInvoiceDraftId: normalizeString(table?.activeInvoiceDraftId),
    lastInvoiceId: normalizeString(table?.lastInvoiceId),
    notes: normalizeString(table?.notes),
    isActive: normalizeBoolean(table?.isActive),
    createdAt: table?.createdAt,
    updatedAt: table?.updatedAt,
  };
}

export function serializeSettings(settings: UnknownRecord | null | undefined): SerializedSettings {
  if (!settings) {
    return null;
  }

  const id = normalizeId(settings?._id ?? settings?.id);

  return {
    id,
    _id: id,
    businessName: normalizeString(settings?.businessName),
    GSTIN: normalizeString(settings?.GSTIN),
    address: normalizeString(settings?.address),
    phone: normalizeString(settings?.phone),
    email: normalizeString(settings?.email),
    logo: normalizeString(settings?.logo),
    footerMessage: normalizeString(settings?.footerMessage),
    thankYouNote: normalizeString(settings?.thankYouNote),
    invoicePrefix: normalizeString(settings?.invoicePrefix, 'INV'),
    defaultGST: normalizeNumber(settings?.defaultGST, 18),
    GSTSlabs: Array.isArray(settings?.GSTSlabs) ? (settings.GSTSlabs as number[]) : [5, 12, 18, 28],
    industryTemplate: settings?.industryTemplate,
    createdAt: settings?.createdAt,
    updatedAt: settings?.updatedAt,
  };
}

export function serializeInvoice(invoice: InvoiceRecord): SerializedInvoice {
  const id = normalizeId(invoice?._id ?? invoice?.id);

  return {
    id,
    _id: id,
    invoiceNumber: normalizeString(invoice?.invoiceNumber),
    invoiceDraftId: normalizeString(invoice?.invoiceDraftId),
    tableId: normalizeId(invoice?.tableId),
    tableName: normalizeString(invoice?.tableName),
    sessionId: normalizeString(invoice?.sessionId),
    customerId: normalizeId(invoice?.customerId),
    customerSnapshot: invoice?.customerSnapshot
      ? {
          customerId: normalizeId(invoice.customerSnapshot.customerId),
          customerName: normalizeString(invoice.customerSnapshot.customerName),
          mobileNumber: normalizeString(invoice.customerSnapshot.mobileNumber),
          email: normalizeString(invoice.customerSnapshot.email),
          numberOfGuests: invoice.customerSnapshot.numberOfGuests,
          specialNotes: normalizeString(invoice.customerSnapshot.specialNotes),
        }
      : undefined,
    items: Array.isArray(invoice?.items)
      ? invoice.items.map((item: InvoiceItemRecord) => ({
          productId: normalizeId(item?.productId),
          productName: normalizeString(item?.productName),
          quantity: normalizeNumber(item?.quantity),
          price: normalizeNumber(item?.price),
          GSTPercentage: normalizeNumber(item?.GSTPercentage),
          GSTAmount: normalizeNumber(item?.GSTAmount),
          total: normalizeNumber(item?.total),
          category: normalizeString(item?.category),
          foodType: normalizeFoodType(item?.foodType),
        }))
      : [],
    subtotal: normalizeNumber(invoice?.subtotal),
    GSTAmount: normalizeNumber(invoice?.GSTAmount),
    discount: normalizeNumber(invoice?.discount),
    grandTotal: normalizeNumber(invoice?.grandTotal),
    invoiceStatus: normalizeInvoiceStatus(invoice?.invoiceStatus),
    paymentStatus: normalizePaymentStatus(invoice?.paymentStatus),
    paymentMode: normalizePaymentMode(invoice?.paymentMode),
    notes: normalizeString(invoice?.notes),
    GSTBreakup: {
      CGST: normalizeNumber(invoice?.GSTBreakup?.CGST),
      SGST: normalizeNumber(invoice?.GSTBreakup?.SGST),
      IGST: normalizeNumber(invoice?.GSTBreakup?.IGST),
    },
    closedAt: invoice?.closedAt as string | Date | undefined,
    printedAt: invoice?.printedAt as string | Date | undefined,
    createdAt: (invoice?.createdAt as string | Date | undefined) ?? new Date(),
    updatedAt: (invoice?.updatedAt as string | Date | undefined) ?? new Date(),
  };
}
