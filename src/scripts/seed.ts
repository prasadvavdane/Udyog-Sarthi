import bcrypt from 'bcryptjs';
import Customer from '@/models/Customer';
import Inventory from '@/models/Inventory';
import Invoice from '@/models/Invoice';
import Loyalty from '@/models/Loyalty';
import Offer from '@/models/Offer';
import Payment from '@/models/Payment';
import Product from '@/models/Product';
import RestaurantTable from '@/models/RestaurantTable';
import Settings from '@/models/Settings';
import Tenant from '@/models/Tenant';
import User from '@/models/User';
import dbConnect from '@/lib/mongodb';
import { createDraftId, createSessionId } from '@/lib/restaurant-utils';
import { demoTenants, type DemoTenantSeed } from '@/lib/demo-tenants';

type SeedDocument = {
  _id: { toString(): string };
};

type SeedProductDoc = SeedDocument & {
  productName: string;
  category: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  GSTPercentage: number;
  foodType: 'veg' | 'non-veg';
};

type SeedCustomerDoc = SeedDocument & {
  name: string;
  mobile: string;
  email?: string;
  numberOfGuests?: number;
  specialNotes?: string;
};

type SeedTableDoc = SeedDocument & {
  tableName: string;
};

function calculateGSTBreakup(items: Array<{ GSTAmount: number }>) {
  return items.reduce(
    (accumulator, item) => {
      accumulator.CGST += item.GSTAmount / 2;
      accumulator.SGST += item.GSTAmount / 2;
      return accumulator;
    },
    { CGST: 0, SGST: 0, IGST: 0 },
  );
}

function tableNamesForTenant(tenant: DemoTenantSeed) {
  if (tenant.industryTemplate === 'restaurant') {
    return ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6', 'Table 7', 'Table 8'];
  }

  return ['Counter 1', 'Counter 2', 'Counter 3'];
}

function customerFixtures(tenant: DemoTenantSeed) {
  return [
    {
      name: `${tenant.businessName} Priority`,
      mobile: `90000${tenant.tenantCode.slice(-4).replace(/\D/g, '1').padEnd(5, '1')}`,
      email: `priority+${tenant.tenantCode}@demo.local`,
      numberOfGuests: tenant.industryTemplate === 'restaurant' ? 4 : undefined,
      specialNotes: tenant.industryTemplate === 'restaurant' ? 'Window side seating preferred' : undefined,
    },
    {
      name: `${tenant.businessName} Repeat`,
      mobile: `90100${tenant.tenantCode.slice(-4).replace(/\D/g, '2').padEnd(5, '2')}`,
      email: `repeat+${tenant.tenantCode}@demo.local`,
      numberOfGuests: tenant.industryTemplate === 'restaurant' ? 2 : undefined,
      specialNotes: tenant.industryTemplate === 'restaurant' ? 'Less spicy food' : undefined,
    },
    {
      name: `${tenant.businessName} Walk-in`,
      mobile: `90200${tenant.tenantCode.slice(-4).replace(/\D/g, '3').padEnd(5, '3')}`,
      email: `walkin+${tenant.tenantCode}@demo.local`,
      numberOfGuests: tenant.industryTemplate === 'restaurant' ? 3 : undefined,
      specialNotes: tenant.industryTemplate === 'restaurant' ? 'Birthday guest' : undefined,
    },
  ];
}

function buildInvoiceItems(
  products: SeedProductDoc[],
  productIndexes: Array<{ index: number; quantity: number }>,
) {
  return productIndexes.map(({ index, quantity }) => {
    const product = products[index];
    const total = product.sellingPrice * quantity;
    const GSTAmount = (total * product.GSTPercentage) / 100;

    return {
      productId: product._id.toString(),
      productName: product.productName,
      quantity,
      price: product.sellingPrice,
      GSTPercentage: product.GSTPercentage,
      GSTAmount,
      total,
      category: product.category,
      foodType: product.foodType ?? 'veg',
    };
  });
}

async function clearTenantData(tenantId: string) {
  await Promise.all([
    Product.deleteMany({ tenantId }),
    Offer.deleteMany({ tenantId }),
    Customer.deleteMany({ tenantId }),
    Invoice.deleteMany({ tenantId }),
    Inventory.deleteMany({ tenantId }),
    Payment.deleteMany({ tenantId }),
    Loyalty.deleteMany({ tenantId }),
    RestaurantTable.deleteMany({ tenantId }),
  ]);
}

async function ensureUser(
  tenantId: string,
  tenant: DemoTenantSeed,
  adminId: string | null,
  userInput: DemoTenantSeed['admin'] | DemoTenantSeed['staff'],
) {
  const existingUser = await User.findOne({ tenantId, email: userInput.email });
  if (existingUser) {
    const password = await bcrypt.hash(userInput.password, 12);
    existingUser.name = userInput.name;
    existingUser.password = password;
    existingUser.role = userInput.role;
    existingUser.businessId = tenant.businessId;
    existingUser.branchId = tenant.branchId;
    existingUser.createdBy = adminId ?? 'system';
    existingUser.isActive = true;
    await existingUser.save();
    return existingUser as SeedDocument;
  }

  const password = await bcrypt.hash(userInput.password, 12);
  return (await User.create({
    tenantId,
    businessId: tenant.businessId,
    branchId: tenant.branchId,
    createdBy: adminId ?? 'system',
    name: userInput.name,
    email: userInput.email,
    password,
    role: userInput.role,
    isActive: true,
  })) as SeedDocument;
}

async function ensureProducts(tenantId: string, tenant: DemoTenantSeed, createdBy: string) {
  const products = [];

  for (const product of tenant.products) {
    const createdProduct = await Product.create({
      tenantId,
      businessId: tenant.businessId,
      branchId: tenant.branchId,
      createdBy,
      productName: product.productName,
      SKU: product.SKU,
      barcode: product.barcode,
      HSN_SAC: product.HSN_SAC,
      category: product.category,
      buyingPrice: product.buyingPrice,
      sellingPrice: product.sellingPrice,
      stockQuantity: product.stockQuantity,
      reorderLevel: product.reorderLevel,
      GSTPercentage: product.GSTPercentage,
      description: `${product.category} item for ${tenant.businessName}`,
      imageUrl: '',
      foodType: tenant.industryTemplate === 'restaurant' ? 'veg' : 'veg',
      isAvailable: product.stockQuantity > 0,
      expiryDate: product.expiryDate ? new Date(product.expiryDate) : undefined,
      batchNumber: product.batchNumber,
      activeStatus: true,
    });

    products.push(createdProduct);
  }

  return products;
}

async function ensureOffers(tenantId: string, tenant: DemoTenantSeed, createdBy: string) {
  for (const offer of tenant.offers) {
    await Offer.create({
      tenantId,
      businessId: tenant.businessId,
      branchId: tenant.branchId,
      createdBy,
      name: offer.name,
      type: offer.type,
      value: offer.value,
      minOrder: offer.minOrder,
      applicableCategories: offer.applicableCategories,
      active: true,
    });
  }
}

async function ensureCustomers(tenantId: string, tenant: DemoTenantSeed, createdBy: string) {
  const customers = [];

  for (const customer of customerFixtures(tenant)) {
    const createdCustomer = await Customer.create({
      tenantId,
      businessId: tenant.businessId,
      branchId: tenant.branchId,
      createdBy,
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      numberOfGuests: customer.numberOfGuests,
      specialNotes: customer.specialNotes,
    });

    customers.push(createdCustomer);
  }

  return customers;
}

async function ensureTables(tenantId: string, tenant: DemoTenantSeed, createdBy: string) {
  const tables = [];

  for (const tableName of tableNamesForTenant(tenant)) {
    const table = await RestaurantTable.create({
      tenantId,
      businessId: tenant.businessId,
      branchId: tenant.branchId,
      createdBy,
      tableName,
      capacity: tenant.industryTemplate === 'restaurant' ? 4 : 1,
      status: 'available',
      isActive: true,
    });

    tables.push(table);
  }

  return tables;
}

async function createSettledInvoice(params: {
  tenant: DemoTenantSeed;
  tenantId: string;
  createdBy: string;
  invoiceNumber: string;
  draftId: string;
  table: SeedTableDoc;
  customer: SeedCustomerDoc;
  products: SeedProductDoc[];
  productIndexes: Array<{ index: number; quantity: number }>;
  paymentMode: 'cash' | 'upi' | 'card';
  createdAt: Date;
  keepTableBilled?: boolean;
}) {
  const items = buildInvoiceItems(params.products, params.productIndexes);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const GSTAmount = items.reduce((sum, item) => sum + item.GSTAmount, 0);
  const grandTotal = subtotal + GSTAmount;
  const sessionId = createSessionId(params.table.tableName);

  const invoice = await Invoice.create({
    tenantId: params.tenantId,
    businessId: params.tenant.businessId,
    branchId: params.tenant.branchId,
    createdBy: params.createdBy,
    invoiceNumber: params.invoiceNumber,
    invoiceDraftId: params.draftId,
    tableId: params.table._id.toString(),
    tableName: params.table.tableName,
    sessionId,
    customerId: params.customer._id.toString(),
    customerSnapshot: {
      customerId: params.customer._id.toString(),
      customerName: params.customer.name,
      mobileNumber: params.customer.mobile,
      email: params.customer.email,
      numberOfGuests: params.customer.numberOfGuests,
      specialNotes: params.customer.specialNotes,
    },
    items,
    subtotal,
    discount: 0,
    GSTAmount,
    grandTotal,
    invoiceStatus: params.keepTableBilled ? 'paid' : 'closed',
    paymentStatus: 'paid',
    paymentMode: params.paymentMode,
    GSTBreakup: calculateGSTBreakup(items),
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
    printedAt: params.keepTableBilled ? undefined : params.createdAt,
    closedAt: params.keepTableBilled ? undefined : params.createdAt,
  });

  await Payment.create({
    tenantId: params.tenantId,
    businessId: params.tenant.businessId,
    branchId: params.tenant.branchId,
    createdBy: params.createdBy,
    invoiceId: invoice._id.toString(),
    amount: grandTotal,
    paymentMode: params.paymentMode,
    status: 'completed',
    transactionId: params.paymentMode === 'upi' ? `UPI-${params.tenant.tenantCode}-${params.invoiceNumber}` : undefined,
    timestamp: params.createdAt,
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
  });

  const points = Math.floor(grandTotal * 0.01);
  await Loyalty.create({
    tenantId: params.tenantId,
    businessId: params.tenant.businessId,
    branchId: params.tenant.branchId,
    createdBy: params.createdBy,
    customerId: params.customer._id.toString(),
    points,
    type: 'earned',
    reference: invoice._id.toString(),
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
  });

  await Customer.findByIdAndUpdate(params.customer._id, {
    $inc: {
      totalSpend: grandTotal,
      loyaltyPoints: points,
    },
    lastVisitDate: params.createdAt,
  });

  await Promise.all(
    params.productIndexes.map(async ({ index, quantity }) => {
      const product = params.products[index];
      const updated = await Product.findByIdAndUpdate(
        product._id,
        { $inc: { stockQuantity: -quantity } },
        { returnDocument: 'after' },
      );

      if (updated) {
        await Product.findByIdAndUpdate(product._id, { isAvailable: updated.stockQuantity > 0 });
      }

      await Inventory.create({
        tenantId: params.tenantId,
        businessId: params.tenant.businessId,
        branchId: params.tenant.branchId,
        createdBy: params.createdBy,
        productId: product._id.toString(),
        quantity: -quantity,
        type: 'out',
        reason: 'Seed sale',
        reference: invoice._id.toString(),
        createdAt: params.createdAt,
        updatedAt: params.createdAt,
      });
    }),
  );

  await RestaurantTable.findByIdAndUpdate(params.table._id, {
    status: params.keepTableBilled ? 'billed' : 'available',
    sessionId: params.keepTableBilled ? sessionId : undefined,
    activeInvoiceDraftId: undefined,
    lastInvoiceId: invoice._id.toString(),
  });

  return invoice;
}

async function createActiveDraft(params: {
  tenant: DemoTenantSeed;
  tenantId: string;
  createdBy: string;
  table: SeedTableDoc;
  customer: SeedCustomerDoc;
  products: SeedProductDoc[];
}) {
  const draftId = createDraftId(params.table.tableName);
  const sessionId = createSessionId(params.table.tableName);
  const items = buildInvoiceItems(params.products, [
    { index: 0, quantity: 1 },
    { index: 2, quantity: 2 },
  ]);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const GSTAmount = items.reduce((sum, item) => sum + item.GSTAmount, 0);

  const draft = await Invoice.create({
    tenantId: params.tenantId,
    businessId: params.tenant.businessId,
    branchId: params.tenant.branchId,
    createdBy: params.createdBy,
    invoiceNumber: draftId,
    invoiceDraftId: draftId,
    tableId: params.table._id.toString(),
    tableName: params.table.tableName,
    sessionId,
    customerId: params.customer._id.toString(),
    customerSnapshot: {
      customerId: params.customer._id.toString(),
      customerName: params.customer.name,
      mobileNumber: params.customer.mobile,
      email: params.customer.email,
      numberOfGuests: params.customer.numberOfGuests,
      specialNotes: 'Draft order for local table reopen testing',
    },
    items,
    subtotal,
    discount: 0,
    GSTAmount,
    grandTotal: subtotal + GSTAmount,
    invoiceStatus: 'active',
    paymentStatus: 'pending',
    GSTBreakup: calculateGSTBreakup(items),
    notes: 'Draft order waiting for settlement',
  });

  await RestaurantTable.findByIdAndUpdate(params.table._id, {
    status: 'occupied',
    sessionId,
    activeInvoiceDraftId: draft._id.toString(),
  });
}

async function seedInvoicesAndTables(
  tenantId: string,
  tenant: DemoTenantSeed,
  createdBy: string,
  customers: SeedCustomerDoc[],
  products: SeedProductDoc[],
  tables: SeedTableDoc[],
) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(13, 15, 0, 0);

  const today = new Date();
  today.setHours(20, 5, 0, 0);

  await createSettledInvoice({
    tenant,
    tenantId,
    createdBy,
    invoiceNumber: `${tenant.tenantCode.toUpperCase()}-0001`,
    draftId: `${tenant.tenantCode.toUpperCase()}-DRF-0001`,
    table: tables[0],
    customer: customers[0],
    products,
    productIndexes: [
      { index: 0, quantity: 2 },
      { index: 1, quantity: 1 },
    ],
    paymentMode: 'upi',
    createdAt: yesterday,
  });

  await createSettledInvoice({
    tenant,
    tenantId,
    createdBy,
    invoiceNumber: `${tenant.tenantCode.toUpperCase()}-0002`,
    draftId: `${tenant.tenantCode.toUpperCase()}-DRF-0002`,
    table: tables[1] ?? tables[0],
    customer: customers[1],
    products,
    productIndexes: [
      { index: 1, quantity: 2 },
      { index: 2, quantity: 1 },
    ],
    paymentMode: 'cash',
    createdAt: today,
  });

  if (tenant.industryTemplate === 'restaurant' && tables.length >= 4) {
    await createActiveDraft({
      tenant,
      tenantId,
      createdBy,
      table: tables[2],
      customer: customers[2],
      products,
    });

    await createSettledInvoice({
      tenant,
      tenantId,
      createdBy,
      invoiceNumber: `${tenant.tenantCode.toUpperCase()}-0003`,
      draftId: `${tenant.tenantCode.toUpperCase()}-DRF-0003`,
      table: tables[3],
      customer: customers[0],
      products,
      productIndexes: [
        { index: 0, quantity: 1 },
        { index: 2, quantity: 2 },
      ],
      paymentMode: 'card',
      createdAt: new Date(),
      keepTableBilled: true,
    });

    await RestaurantTable.findByIdAndUpdate(tables[4]._id, { status: 'reserved' });
  }
}

async function seedTenant(tenant: DemoTenantSeed) {
  const tenantDocument = await Tenant.findOneAndUpdate(
    { tenantCode: tenant.tenantCode },
    {
      name: tenant.businessName,
      email: tenant.email,
      tenantCode: tenant.tenantCode,
      industry: tenant.industryTemplate,
      subscriptionPlan: tenant.subscriptionPlan,
      isActive: true,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  const tenantId = tenantDocument._id.toString();
  await clearTenantData(tenantId);

  const admin = await ensureUser(tenantId, tenant, null, tenant.admin);
  await ensureUser(tenantId, tenant, admin._id.toString(), tenant.staff);

  await Settings.findOneAndUpdate(
    { tenantId },
    {
      tenantId,
      businessId: tenant.businessId,
      branchId: tenant.branchId,
      createdBy: admin._id.toString(),
      businessName: tenant.businessName,
      GSTIN: tenant.gstin,
      address: tenant.address,
      phone: tenant.phone,
      email: tenant.email,
      GSTSlabs: [5, 12, 18, 28],
      defaultGST: tenant.industryTemplate === 'restaurant' ? 5 : 18,
      currency: 'INR',
      invoicePrefix: tenant.industryTemplate === 'restaurant' ? 'RST' : 'INV',
      loyaltyPointsPerRupee: 0.01,
      industryTemplate: tenant.industryTemplate,
      footerMessage: `Generated for ${tenant.businessName}`,
      thankYouNote: tenant.industryTemplate === 'restaurant' ? 'Thank you for dining with us.' : 'Thank you for your visit.',
      logo: '',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  const products = await ensureProducts(tenantId, tenant, admin._id.toString());
  await ensureOffers(tenantId, tenant, admin._id.toString());
  const customers = await ensureCustomers(tenantId, tenant, admin._id.toString());
  const tables = await ensureTables(tenantId, tenant, admin._id.toString());
  await seedInvoicesAndTables(tenantId, tenant, admin._id.toString(), customers, products, tables);

  return {
    tenantId,
    tenantCode: tenant.tenantCode,
    adminEmail: tenant.admin.email,
    adminPassword: tenant.admin.password,
    staffEmail: tenant.staff.email,
    staffPassword: tenant.staff.password,
  };
}

async function seed() {
  try {
    await dbConnect();
    console.log('Connected to database');

    const credentials = [];
    for (const tenant of demoTenants) {
      console.log(`Seeding ${tenant.businessName} (${tenant.tenantCode})...`);
      credentials.push(await seedTenant(tenant));
    }

    console.log('\nSeed completed successfully.\n');
    console.table(
      credentials.map((tenant) => ({
        tenantCode: tenant.tenantCode,
        tenantId: tenant.tenantId,
        admin: tenant.adminEmail,
        adminPassword: tenant.adminPassword,
        staff: tenant.staffEmail,
        staffPassword: tenant.staffPassword,
      })),
    );
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

void seed();
