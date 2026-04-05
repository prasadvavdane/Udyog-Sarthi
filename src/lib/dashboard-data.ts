import Customer from '@/models/Customer';
import Invoice from '@/models/Invoice';
import Offer from '@/models/Offer';
import Payment from '@/models/Payment';
import Product from '@/models/Product';
import Settings from '@/models/Settings';
import Tenant from '@/models/Tenant';
import dbConnect from '@/lib/mongodb';
import { getIndustryTemplateMeta } from '@/lib/demo-tenants';
import type { BusinessTemplate } from '@/types';
import type { TenantSessionUser } from '@/lib/server-auth';

type InvoiceLine = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  GSTPercentage: number;
};

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLastNDays(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    date.setHours(0, 0, 0, 0);
    return date;
  });
}

function safeTemplate(template?: BusinessTemplate): BusinessTemplate {
  return template ?? 'retail';
}

export type WorkspaceSummary = {
  businessName: string;
  gstin: string;
  phone: string;
  email: string;
  industryTemplate: BusinessTemplate;
  tenantCode: string;
  subscriptionPlan: string;
  branchId: string;
};

export type DashboardSnapshot = {
  workspace: WorkspaceSummary;
  templateMeta: ReturnType<typeof getIndustryTemplateMeta>;
  metrics: {
    todaySales: number;
    monthRevenue: number;
    totalRevenue: number;
    totalProfit: number;
    totalGst: number;
    pendingPayments: number;
    activeOffers: number;
    totalCustomers: number;
  };
  inventory: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    fastMoving: number;
  };
  salesTrend: Array<{ label: string; sales: number; profit: number }>;
  paymentSplit: Array<{ name: string; value: number }>;
  topProducts: Array<{
    id: string;
    name: string;
    category: string;
    sold: number;
    revenue: number;
    stockQuantity: number;
  }>;
  productCatalog: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    stockQuantity: number;
    reorderLevel: number;
    sellingPrice: number;
    buyingPrice: number;
    gst: number;
    status: 'in-stock' | 'low-stock' | 'out-of-stock';
  }>;
  customerList: Array<{
    id: string;
    name: string;
    mobile: string;
    totalSpend: number;
    loyaltyPoints: number;
    lastVisitDate?: Date;
    tier: 'Bronze' | 'Silver' | 'Gold';
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    createdAt: Date;
    grandTotal: number;
    paymentStatus: string;
    paymentMode?: string;
  }>;
  activeOffers: Array<{
    id: string;
    name: string;
    type: string;
    value: number;
    minOrder?: number;
  }>;
};

export async function getWorkspaceSummary(user: TenantSessionUser): Promise<WorkspaceSummary> {
  await dbConnect();

  const [settings, tenant] = await Promise.all([
    Settings.findOne({ tenantId: user.tenantId }),
    Tenant.findById(user.tenantId),
  ]);

  const industryTemplate = safeTemplate(
    (settings?.industryTemplate as BusinessTemplate | undefined) ||
      (tenant?.industry as BusinessTemplate | undefined),
  );

  return {
    businessName: settings?.businessName ?? tenant?.name ?? 'Billing Workspace',
    gstin: settings?.GSTIN ?? 'GST setup pending',
    phone: settings?.phone ?? 'Phone not configured',
    email: settings?.email ?? user.email ?? 'Email not configured',
    industryTemplate,
    tenantCode: tenant?.tenantCode ?? user.tenantCode ?? user.tenantId,
    subscriptionPlan: tenant?.subscriptionPlan ?? 'starter',
    branchId: user.branchId,
  };
}

export async function getTenantDashboardSnapshot(user: TenantSessionUser): Promise<DashboardSnapshot> {
  await dbConnect();

  const [workspace, products, customers, invoices, payments, offers] = await Promise.all([
    getWorkspaceSummary(user),
    Product.find({ tenantId: user.tenantId, activeStatus: true }).sort({ updatedAt: -1 }),
    Customer.find({ tenantId: user.tenantId }).sort({ totalSpend: -1 }),
    Invoice.find({ tenantId: user.tenantId }).sort({ createdAt: -1 }).limit(120),
    Payment.find({ tenantId: user.tenantId, status: 'completed' }).sort({ createdAt: -1 }).limit(120),
    Offer.find({ tenantId: user.tenantId, active: true }).sort({ updatedAt: -1 }).limit(12),
  ]);

  const templateMeta = getIndustryTemplateMeta(workspace.industryTemplate);
  const productLookup = new Map(products.map((product) => [product._id.toString(), product]));
  const today = startOfToday();
  const monthStart = startOfMonth();

  let todaySales = 0;
  let monthRevenue = 0;
  let totalRevenue = 0;
  let totalProfit = 0;
  let totalGst = 0;
  let pendingPayments = 0;

  const salesSeries = new Map(
    getLastNDays(7).map((date) => [
      dayKey(date),
      { label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), sales: 0, profit: 0 },
    ]),
  );

  const soldByProduct = new Map<string, { name: string; category: string; sold: number; revenue: number }>();

  invoices.forEach((invoice) => {
    const createdAt = new Date(invoice.createdAt);
    totalRevenue += invoice.grandTotal;
    totalGst += invoice.GSTAmount;

    if (createdAt >= today) {
      todaySales += invoice.grandTotal;
    }

    if (createdAt >= monthStart) {
      monthRevenue += invoice.grandTotal;
    }

    if (invoice.paymentStatus !== 'paid') {
      pendingPayments += invoice.grandTotal;
    }

    const day = salesSeries.get(dayKey(createdAt));
    let invoiceProfit = 0;

    (invoice.items as InvoiceLine[]).forEach((item) => {
      const product = productLookup.get(item.productId.toString());
      const unitProfit = item.price - (product?.buyingPrice ?? 0);
      invoiceProfit += unitProfit * item.quantity;

      const current = soldByProduct.get(item.productId.toString()) ?? {
        name: item.productName,
        category: product?.category ?? 'General',
        sold: 0,
        revenue: 0,
      };

      current.sold += item.quantity;
      current.revenue += item.total;
      soldByProduct.set(item.productId.toString(), current);
    });

    totalProfit += invoiceProfit;

    if (day) {
      day.sales += invoice.grandTotal;
      day.profit += invoiceProfit;
    }
  });

  const paymentSplitMap = new Map<string, number>();
  payments.forEach((payment) => {
    paymentSplitMap.set(payment.paymentMode, (paymentSplitMap.get(payment.paymentMode) ?? 0) + payment.amount);
  });

  if (paymentSplitMap.size === 0) {
    paymentSplitMap.set('cash', 0);
    paymentSplitMap.set('upi', 0);
    paymentSplitMap.set('card', 0);
  }

  const topProducts = [...soldByProduct.entries()]
    .map(([id, item]) => ({
      id,
      name: item.name,
      category: item.category,
      sold: item.sold,
      revenue: item.revenue,
      stockQuantity: productLookup.get(id)?.stockQuantity ?? 0,
    }))
    .sort((left, right) => right.sold - left.sold)
    .slice(0, 5);

  const inventory = {
    inStock: products.filter((product) => product.stockQuantity > product.reorderLevel).length,
    lowStock: products.filter((product) => product.stockQuantity > 0 && product.stockQuantity <= product.reorderLevel).length,
    outOfStock: products.filter((product) => product.stockQuantity <= 0).length,
    fastMoving: topProducts.length,
  };

  return {
    workspace,
    templateMeta,
    metrics: {
      todaySales,
      monthRevenue,
      totalRevenue,
      totalProfit,
      totalGst,
      pendingPayments,
      activeOffers: offers.length,
      totalCustomers: customers.length,
    },
    inventory,
    salesTrend: [...salesSeries.values()],
    paymentSplit: [...paymentSplitMap.entries()].map(([name, value]) => ({ name, value })),
    topProducts,
    productCatalog: products.map((product) => ({
      id: product._id.toString(),
      name: product.productName,
      sku: product.SKU,
      category: product.category,
      stockQuantity: product.stockQuantity,
      reorderLevel: product.reorderLevel,
      sellingPrice: product.sellingPrice,
      buyingPrice: product.buyingPrice,
      gst: product.GSTPercentage,
      status:
        product.stockQuantity <= 0
          ? 'out-of-stock'
          : product.stockQuantity <= product.reorderLevel
            ? 'low-stock'
            : 'in-stock',
    })),
    customerList: customers.slice(0, 8).map((customer) => ({
      id: customer._id.toString(),
      name: customer.name,
      mobile: customer.mobile,
      totalSpend: customer.totalSpend,
      loyaltyPoints: customer.loyaltyPoints,
      lastVisitDate: customer.lastVisitDate,
      tier: customer.totalSpend >= 20000 ? 'Gold' : customer.totalSpend >= 8000 ? 'Silver' : 'Bronze',
    })),
    recentInvoices: invoices.slice(0, 8).map((invoice) => ({
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt,
      grandTotal: invoice.grandTotal,
      paymentStatus: invoice.paymentStatus,
      paymentMode: invoice.paymentMode,
    })),
    activeOffers: offers.map((offer) => ({
      id: offer._id.toString(),
      name: offer.name,
      type: offer.type,
      value: offer.value,
      minOrder: offer.minOrder,
    })),
  };
}
