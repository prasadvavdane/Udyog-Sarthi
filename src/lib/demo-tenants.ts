import type { BusinessTemplate } from '@/types';

export type DemoRole = 'business-admin' | 'billing-staff';

export interface DemoUserSeed {
  name: string;
  email: string;
  password: string;
  role: DemoRole;
}

export interface DemoProductSeed {
  productName: string;
  SKU: string;
  barcode: string;
  HSN_SAC: string;
  category: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  GSTPercentage: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface DemoOfferSeed {
  name: string;
  type: 'flat' | 'percentage' | 'product' | 'category' | 'combo' | 'coupon';
  value: number;
  minOrder?: number;
  applicableCategories?: string[];
}

export interface DemoTenantSeed {
  tenantCode: string;
  businessName: string;
  industryTemplate: BusinessTemplate;
  email: string;
  subscriptionPlan: string;
  phone: string;
  gstin: string;
  address: string;
  branchId: string;
  businessId: string;
  notes: string[];
  admin: DemoUserSeed;
  staff: DemoUserSeed;
  products: DemoProductSeed[];
  offers: DemoOfferSeed[];
}

type TemplateMeta = {
  label: string;
  summary: string;
  modules: string[];
  emphasis: string;
};

const templateMeta: Record<BusinessTemplate, TemplateMeta> = {
  restaurant: {
    label: 'Restaurant POS',
    summary: 'Table billing, kitchen tokens, dine-in and takeaway workflows.',
    modules: ['Table service', 'KOT queue', 'Dine-in vs takeaway', 'Shift settlements'],
    emphasis: 'Warm service flow',
  },
  'medical-store': {
    label: 'Medical Store',
    summary: 'Expiry-aware billing for pharmacy counters and GST-heavy inventory.',
    modules: ['Batch tracking', 'Expiry watch', 'Prescription notes', 'Fast repeat billing'],
    emphasis: 'Compliance first',
  },
  grocery: {
    label: 'Grocery',
    summary: 'Barcode speed billing, bulk counters, and weight-based pricing.',
    modules: ['Weighing items', 'Bulk offers', 'Barcode search', 'Fast-moving SKUs'],
    emphasis: 'High-throughput checkout',
  },
  salon: {
    label: 'Salon',
    summary: 'Service packages, staff commission, and repeat visit retention.',
    modules: ['Service billing', 'Staff commission', 'Packages', 'CRM follow-ups'],
    emphasis: 'Relationship led growth',
  },
  retail: {
    label: 'Retail',
    summary: 'General retail operations with strong inventory and GST basics.',
    modules: ['Category billing', 'Inventory alerts', 'Payment split', 'Offer engine'],
    emphasis: 'Balanced operations',
  },
  'general-store': {
    label: 'General Store',
    summary: 'A simple all-round template for mixed-counter neighborhood stores.',
    modules: ['Counter POS', 'Quick coupons', 'Margin visibility', 'Walk-in CRM'],
    emphasis: 'Everyday reliability',
  },
  'service-business': {
    label: 'Service Business',
    summary: 'Service invoicing, customer follow-ups, and payment collection.',
    modules: ['Service catalog', 'Visit reminders', 'Advance payments', 'Customer history'],
    emphasis: 'Service retention',
  },
};

export function getIndustryTemplateMeta(template: BusinessTemplate): TemplateMeta {
  return templateMeta[template];
}

export const demoTenants: DemoTenantSeed[] = [
  {
    tenantCode: 'demo-pharmacy',
    businessName: 'Sanjeevani Medico',
    industryTemplate: 'medical-store',
    email: 'owner@sanjeevanimedico.in',
    subscriptionPlan: 'growth',
    phone: '+91 98765 40001',
    gstin: '27AAACS1234E1ZP',
    address: 'Shop 4, Lake View Arcade, Pune, Maharashtra 411038',
    branchId: 'branch-pune-main',
    businessId: 'biz-sanjeevani',
    notes: ['Expiry tracking on', 'Loyalty enabled at 1 point per Rs 100'],
    admin: {
      name: 'Aditi Shah',
      email: 'admin@sanjeevanimedico.in',
      password: 'Admin@123',
      role: 'business-admin',
    },
    staff: {
      name: 'Ravi Patil',
      email: 'cashier@sanjeevanimedico.in',
      password: 'Staff@123',
      role: 'billing-staff',
    },
    products: [
      {
        productName: 'Paracetamol 650mg',
        SKU: 'MED-PCM-650',
        barcode: '8902001001001',
        HSN_SAC: '30049099',
        category: 'Medicines',
        buyingPrice: 18,
        sellingPrice: 34,
        stockQuantity: 124,
        reorderLevel: 24,
        GSTPercentage: 18,
        batchNumber: 'PCM24A',
        expiryDate: '2027-02-28',
      },
      {
        productName: 'Vitamin C Tablets',
        SKU: 'MED-VIT-C',
        barcode: '8902001001002',
        HSN_SAC: '30045039',
        category: 'Supplements',
        buyingPrice: 52,
        sellingPrice: 94,
        stockQuantity: 68,
        reorderLevel: 12,
        GSTPercentage: 18,
        batchNumber: 'VTC24B',
        expiryDate: '2026-12-31',
      },
      {
        productName: 'Digital Thermometer',
        SKU: 'MED-THERM',
        barcode: '8902001001003',
        HSN_SAC: '90251990',
        category: 'Devices',
        buyingPrice: 92,
        sellingPrice: 160,
        stockQuantity: 22,
        reorderLevel: 8,
        GSTPercentage: 18,
      },
    ],
    offers: [
      { name: 'Rs 100 off above Rs 1200', type: 'flat', value: 100, minOrder: 1200 },
      { name: '5% off on supplements', type: 'category', value: 5, applicableCategories: ['Supplements'] },
    ],
  },
  {
    tenantCode: 'demo-restaurant',
    businessName: 'Masala Table',
    industryTemplate: 'restaurant',
    email: 'owner@masalatable.in',
    subscriptionPlan: 'scale',
    phone: '+91 98765 40002',
    gstin: '29AAACM4567K1ZM',
    address: '14 Residency Road, Bengaluru, Karnataka 560025',
    branchId: 'branch-blr-dinein',
    businessId: 'biz-masala-table',
    notes: ['Table billing active', 'Kitchen token support available'],
    admin: {
      name: 'Neha Arora',
      email: 'admin@masalatable.in',
      password: 'Admin@123',
      role: 'business-admin',
    },
    staff: {
      name: 'Karan Mehta',
      email: 'cashier@masalatable.in',
      password: 'Staff@123',
      role: 'billing-staff',
    },
    products: [
      {
        productName: 'Paneer Tikka',
        SKU: 'RST-PAN-TIK',
        barcode: '8902002001001',
        HSN_SAC: '996331',
        category: 'Starters',
        buyingPrice: 110,
        sellingPrice: 220,
        stockQuantity: 48,
        reorderLevel: 10,
        GSTPercentage: 5,
      },
      {
        productName: 'Veg Biryani',
        SKU: 'RST-VEG-BIR',
        barcode: '8902002001002',
        HSN_SAC: '996331',
        category: 'Main Course',
        buyingPrice: 90,
        sellingPrice: 180,
        stockQuantity: 56,
        reorderLevel: 12,
        GSTPercentage: 5,
      },
      {
        productName: 'Fresh Lime Soda',
        SKU: 'RST-LIME',
        barcode: '8902002001003',
        HSN_SAC: '220210',
        category: 'Beverages',
        buyingPrice: 18,
        sellingPrice: 70,
        stockQuantity: 90,
        reorderLevel: 20,
        GSTPercentage: 12,
      },
    ],
    offers: [
      { name: '10% dinner combo', type: 'combo', value: 10, minOrder: 799 },
      { name: 'Rs 150 off above Rs 1500', type: 'flat', value: 150, minOrder: 1500 },
    ],
  },
  {
    tenantCode: 'demo-grocery',
    businessName: 'Daily Basket Mart',
    industryTemplate: 'grocery',
    email: 'owner@dailybasketmart.in',
    subscriptionPlan: 'growth',
    phone: '+91 98765 40003',
    gstin: '24AAACD8890L1ZX',
    address: '52 Ring Road, Ahmedabad, Gujarat 380015',
    branchId: 'branch-ahm-counter',
    businessId: 'biz-daily-basket',
    notes: ['Barcode-first checkout', 'Bulk discount engine active'],
    admin: {
      name: 'Devanshi Patel',
      email: 'admin@dailybasketmart.in',
      password: 'Admin@123',
      role: 'business-admin',
    },
    staff: {
      name: 'Suresh Solanki',
      email: 'cashier@dailybasketmart.in',
      password: 'Staff@123',
      role: 'billing-staff',
    },
    products: [
      {
        productName: 'Basmati Rice 5kg',
        SKU: 'GRC-RICE-5KG',
        barcode: '8902003001001',
        HSN_SAC: '10063020',
        category: 'Staples',
        buyingPrice: 325,
        sellingPrice: 420,
        stockQuantity: 40,
        reorderLevel: 10,
        GSTPercentage: 5,
      },
      {
        productName: 'Sunflower Oil 1L',
        SKU: 'GRC-OIL-1L',
        barcode: '8902003001002',
        HSN_SAC: '15121910',
        category: 'Essentials',
        buyingPrice: 118,
        sellingPrice: 145,
        stockQuantity: 72,
        reorderLevel: 18,
        GSTPercentage: 5,
      },
      {
        productName: 'Detergent Powder 2kg',
        SKU: 'GRC-DET-2KG',
        barcode: '8902003001003',
        HSN_SAC: '34022090',
        category: 'Home Care',
        buyingPrice: 170,
        sellingPrice: 235,
        stockQuantity: 31,
        reorderLevel: 8,
        GSTPercentage: 18,
      },
    ],
    offers: [
      { name: '5% off above Rs 1000', type: 'percentage', value: 5, minOrder: 1000 },
      { name: 'Home care combo offer', type: 'category', value: 8, applicableCategories: ['Home Care'] },
    ],
  },
  {
    tenantCode: 'demo-salon',
    businessName: 'Blush & Bloom Salon',
    industryTemplate: 'salon',
    email: 'owner@blushbloom.in',
    subscriptionPlan: 'growth',
    phone: '+91 98765 40004',
    gstin: '07AAACB6677N1Z8',
    address: 'H-12 South Extension, New Delhi 110049',
    branchId: 'branch-delhi-main',
    businessId: 'biz-blush-bloom',
    notes: ['Service packages enabled', 'Staff commission view suggested'],
    admin: {
      name: 'Megha Kapoor',
      email: 'admin@blushbloom.in',
      password: 'Admin@123',
      role: 'business-admin',
    },
    staff: {
      name: 'Pooja Nair',
      email: 'cashier@blushbloom.in',
      password: 'Staff@123',
      role: 'billing-staff',
    },
    products: [
      {
        productName: 'Hair Spa Service',
        SKU: 'SAL-HAIR-SPA',
        barcode: '8902004001001',
        HSN_SAC: '999723',
        category: 'Services',
        buyingPrice: 280,
        sellingPrice: 650,
        stockQuantity: 20,
        reorderLevel: 6,
        GSTPercentage: 18,
      },
      {
        productName: 'Keratin Shampoo',
        SKU: 'SAL-KER-SHA',
        barcode: '8902004001002',
        HSN_SAC: '33051090',
        category: 'Retail Products',
        buyingPrice: 240,
        sellingPrice: 390,
        stockQuantity: 26,
        reorderLevel: 6,
        GSTPercentage: 18,
      },
      {
        productName: 'Facial Session',
        SKU: 'SAL-FACIAL',
        barcode: '8902004001003',
        HSN_SAC: '999723',
        category: 'Services',
        buyingPrice: 350,
        sellingPrice: 850,
        stockQuantity: 16,
        reorderLevel: 4,
        GSTPercentage: 18,
      },
    ],
    offers: [
      { name: 'Flat Rs 200 off above Rs 2000', type: 'flat', value: 200, minOrder: 2000 },
      { name: '10% package savings', type: 'percentage', value: 10, minOrder: 1500 },
    ],
  },
];

export const demoAccounts = demoTenants.flatMap((tenant) => [
  {
    tenantCode: tenant.tenantCode,
    businessName: tenant.businessName,
    role: tenant.admin.role,
    email: tenant.admin.email,
    password: tenant.admin.password,
    industryTemplate: tenant.industryTemplate,
  },
  {
    tenantCode: tenant.tenantCode,
    businessName: tenant.businessName,
    role: tenant.staff.role,
    email: tenant.staff.email,
    password: tenant.staff.password,
    industryTemplate: tenant.industryTemplate,
  },
]);
