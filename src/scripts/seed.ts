import bcrypt from 'bcryptjs';
import Customer from '@/models/Customer';
import Inventory from '@/models/Inventory';
import Invoice from '@/models/Invoice';
import Loyalty from '@/models/Loyalty';
import Offer from '@/models/Offer';
import Payment from '@/models/Payment';
import Product from '@/models/Product';
import Settings from '@/models/Settings';
import Tenant from '@/models/Tenant';
import User from '@/models/User';
import dbConnect from '@/lib/mongodb';
import { demoTenants, type DemoTenantSeed } from '@/lib/demo-tenants';

type SeedUser = {
  _id: { toString(): string };
};

function calculateGSTBreakup(items: Array<{ total: number; GSTPercentage: number }>) {
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

function customerFixtures(tenant: DemoTenantSeed) {
  return [
    {
      name: `${tenant.businessName} Priority`,
      mobile: `90000${tenant.tenantCode.slice(-4).replace(/\D/g, '1').padEnd(5, '1')}`,
      email: `priority+${tenant.tenantCode}@demo.local`,
      birthday: new Date('1991-06-14'),
    },
    {
      name: `${tenant.businessName} Repeat`,
      mobile: `90100${tenant.tenantCode.slice(-4).replace(/\D/g, '2').padEnd(5, '2')}`,
      email: `repeat+${tenant.tenantCode}@demo.local`,
      birthday: new Date('1988-11-02'),
    },
    {
      name: `${tenant.businessName} Walk-in`,
      mobile: `90200${tenant.tenantCode.slice(-4).replace(/\D/g, '3').padEnd(5, '3')}`,
      email: `walkin+${tenant.tenantCode}@demo.local`,
      birthday: new Date('1995-03-09'),
    },
  ];
}

async function ensureUser(tenantId: string, tenant: DemoTenantSeed, adminId: string | null, userInput: DemoTenantSeed['admin'] | DemoTenantSeed['staff']) {
  const existingUser = await User.findOne({ tenantId, email: userInput.email });
  if (existingUser) {
    return existingUser as SeedUser;
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
  })) as SeedUser;
}

async function ensureProducts(tenantId: string, tenant: DemoTenantSeed, createdBy: string) {
  const productDocs = [];

  for (const product of tenant.products) {
    const existingProduct = await Product.findOne({ tenantId, SKU: product.SKU });
    if (existingProduct) {
      productDocs.push(existingProduct);
      continue;
    }

    const createdProduct = await Product.create({
      tenantId,
      businessId: tenant.businessId,
      branchId: tenant.branchId,
      createdBy,
      ...product,
      expiryDate: product.expiryDate ? new Date(product.expiryDate) : undefined,
      activeStatus: true,
    });
    productDocs.push(createdProduct);
  }

  return productDocs;
}

async function ensureOffers(tenantId: string, tenant: DemoTenantSeed, createdBy: string) {
  for (const offer of tenant.offers) {
    await Offer.findOneAndUpdate(
      { tenantId, name: offer.name },
      {
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
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  }
}

async function ensureCustomers(tenantId: string, tenant: DemoTenantSeed, createdBy: string) {
  const customers = [];

  for (const customer of customerFixtures(tenant)) {
    const document = await Customer.findOneAndUpdate(
      { tenantId, mobile: customer.mobile },
      {
        tenantId,
        businessId: tenant.businessId,
        branchId: tenant.branchId,
        createdBy,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        birthday: customer.birthday,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    customers.push(document);
  }

  return customers;
}

async function seedSampleInvoices(
  tenantId: string,
  tenant: DemoTenantSeed,
  createdBy: string,
  customers: Awaited<ReturnType<typeof ensureCustomers>>,
  products: Awaited<ReturnType<typeof ensureProducts>>,
) {
  const invoiceCount = await Invoice.countDocuments({ tenantId });
  if (invoiceCount > 0) {
    return;
  }

  const recipes = [
    {
      invoiceNumber: `${tenant.tenantCode.toUpperCase()}-0001`,
      productIndexes: [
        { index: 0, quantity: 2 },
        { index: 1, quantity: 1 },
      ],
      paymentMode: 'upi' as const,
      customerIndex: 0,
      dayOffset: 1,
    },
    {
      invoiceNumber: `${tenant.tenantCode.toUpperCase()}-0002`,
      productIndexes: [
        { index: 1, quantity: 2 },
        { index: 2, quantity: 1 },
      ],
      paymentMode: 'cash' as const,
      customerIndex: 1,
      dayOffset: 0,
    },
  ];

  for (const recipe of recipes) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - recipe.dayOffset);

    const items = recipe.productIndexes.map(({ index, quantity }) => {
      const product = products[index];
      const total = product.sellingPrice * quantity;
      const GSTPercentage = product.GSTPercentage;
      return {
        productId: product._id.toString(),
        productName: product.productName,
        quantity,
        price: product.sellingPrice,
        GSTPercentage,
        GSTAmount: (total * GSTPercentage) / 100,
        total,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const GSTAmount = items.reduce((sum, item) => sum + item.GSTAmount, 0);
    const grandTotal = subtotal + GSTAmount;
    const customer = customers[recipe.customerIndex];
    const points = Math.floor(grandTotal * 0.01);

    const invoice = await Invoice.create({
      tenantId,
      businessId: tenant.businessId,
      branchId: tenant.branchId,
      createdBy,
      invoiceNumber: recipe.invoiceNumber,
      customerId: customer._id.toString(),
      items,
      subtotal,
      discount: 0,
      GSTAmount,
      grandTotal,
      paymentStatus: 'paid',
      paymentMode: recipe.paymentMode,
      GSTBreakup: calculateGSTBreakup(items),
      createdAt,
      updatedAt: createdAt,
    });

    await Payment.create({
      tenantId,
      businessId: tenant.businessId,
      branchId: tenant.branchId,
      createdBy,
      invoiceId: invoice._id.toString(),
      amount: grandTotal,
      paymentMode: recipe.paymentMode,
      status: 'completed',
      transactionId: recipe.paymentMode === 'upi' ? `UPI-${tenant.tenantCode}-${recipe.invoiceNumber}` : undefined,
      timestamp: createdAt,
      createdAt,
      updatedAt: createdAt,
    });

    await Loyalty.create({
      tenantId,
      businessId: tenant.businessId,
      branchId: tenant.branchId,
      createdBy,
      customerId: customer._id.toString(),
      points,
      type: 'earned',
      reference: invoice._id.toString(),
      createdAt,
      updatedAt: createdAt,
    });

    await Customer.findByIdAndUpdate(customer._id, {
      $inc: {
        totalSpend: grandTotal,
        loyaltyPoints: points,
      },
      lastVisitDate: createdAt,
    });

    await Promise.all(
      recipe.productIndexes.map(async ({ index, quantity }) => {
        const product = products[index];
        await Product.findByIdAndUpdate(product._id, { $inc: { stockQuantity: -quantity } });
        await Inventory.create({
          tenantId,
          businessId: tenant.businessId,
          branchId: tenant.branchId,
          createdBy,
          productId: product._id.toString(),
          quantity: -quantity,
          type: 'out',
          reason: 'Seed sale',
          reference: invoice._id.toString(),
          createdAt,
          updatedAt: createdAt,
        });
      }),
    );
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
      defaultGST: 18,
      currency: 'INR',
      invoicePrefix: 'INV',
      loyaltyPointsPerRupee: 0.01,
      industryTemplate: tenant.industryTemplate,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  const products = await ensureProducts(tenantId, tenant, admin._id.toString());
  await ensureOffers(tenantId, tenant, admin._id.toString());
  const customers = await ensureCustomers(tenantId, tenant, admin._id.toString());
  await seedSampleInvoices(tenantId, tenant, admin._id.toString(), customers, products);

  return {
    tenantId,
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
        tenantCode: demoTenants.find((item) => item.admin.email === tenant.adminEmail)?.tenantCode,
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
