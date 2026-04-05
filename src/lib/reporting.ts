import Invoice from '@/models/Invoice';
import Product from '@/models/Product';
import Settings from '@/models/Settings';
import dbConnect from '@/lib/mongodb';

export type ReportType =
  | 'daily-sales'
  | 'weekly-sales'
  | 'monthly-sales'
  | 'yearly-sales'
  | 'item-wise-sales'
  | 'table-wise-revenue'
  | 'customer-wise-revenue'
  | 'profit-report'
  | 'tax-report';

export type ReportColumn = {
  key: string;
  label: string;
};

export type ReportOutput = {
  title: string;
  columns: ReportColumn[];
  rows: Array<Record<string, string | number>>;
  totals: Record<string, string | number>;
  vendorName: string;
  generatedAt: string;
};

type ReportInvoiceItem = {
  productId: { toString(): string } | string;
  productName: string;
  quantity: number;
  total: number;
  GSTPercentage: number;
  GSTAmount: number;
};

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function parseDateRange(from?: string, to?: string) {
  const fallback = defaultRange();
  return {
    start: from ? new Date(from) : fallback.start,
    end: to ? new Date(to) : fallback.end,
  };
}

function formatBucket(date: Date, type: ReportType) {
  if (type === 'daily-sales') {
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  if (type === 'weekly-sales') {
    const copy = new Date(date);
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
    return `Week of ${copy.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
  }

  if (type === 'monthly-sales') {
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }

  return date.getFullYear().toString();
}

export async function buildReportData(tenantId: string, reportType: ReportType, from?: string, to?: string): Promise<ReportOutput> {
  await dbConnect();

  const { start, end } = parseDateRange(from, to);
  const [invoices, products, settings] = await Promise.all([
    Invoice.find({
      tenantId,
      invoiceStatus: { $in: ['paid', 'closed'] },
      createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 }),
    Product.find({ tenantId }),
    Settings.findOne({ tenantId }),
  ]);

  const productLookup = new Map(products.map((product) => [product._id.toString(), product]));
  const vendorName = settings?.businessName ?? 'Restaurant POS';
  const generatedAt = new Date().toISOString();

  if (['daily-sales', 'weekly-sales', 'monthly-sales', 'yearly-sales'].includes(reportType)) {
    const grouped = new Map<string, { sales: number; tax: number; bills: number }>();

    invoices.forEach((invoice) => {
      const key = formatBucket(new Date(invoice.createdAt), reportType);
      const row = grouped.get(key) ?? { sales: 0, tax: 0, bills: 0 };
      row.sales += invoice.grandTotal;
      row.tax += invoice.GSTAmount;
      row.bills += 1;
      grouped.set(key, row);
    });

    const rows = [...grouped.entries()].map(([period, value]) => ({
      period,
      bills: value.bills,
      sales: Number(value.sales.toFixed(2)),
      tax: Number(value.tax.toFixed(2)),
    }));

    return {
      title: reportType.replace(/-/g, ' '),
      vendorName,
      generatedAt,
      columns: [
        { key: 'period', label: 'Period' },
        { key: 'bills', label: 'Bills' },
        { key: 'sales', label: 'Sales' },
        { key: 'tax', label: 'Tax' },
      ],
      rows,
      totals: {
        bills: rows.reduce((sum, row) => sum + Number(row.bills), 0),
        sales: rows.reduce((sum, row) => sum + Number(row.sales), 0).toFixed(2),
        tax: rows.reduce((sum, row) => sum + Number(row.tax), 0).toFixed(2),
      },
    };
  }

  if (reportType === 'item-wise-sales' || reportType === 'profit-report') {
    const grouped = new Map<string, { item: string; qty: number; revenue: number; cost: number; profit: number }>();

    invoices.forEach((invoice) => {
      (invoice.items as ReportInvoiceItem[]).forEach((item: ReportInvoiceItem) => {
        const key = item.productId.toString();
        const product = productLookup.get(key);
        const cost = (product?.buyingPrice ?? 0) * item.quantity;
        const revenue = item.total;
        const row = grouped.get(key) ?? { item: item.productName, qty: 0, revenue: 0, cost: 0, profit: 0 };
        row.qty += item.quantity;
        row.revenue += revenue;
        row.cost += cost;
        row.profit += revenue - cost;
        grouped.set(key, row);
      });
    });

    const rows = [...grouped.values()].map((row) => ({
      item: row.item,
      qty: row.qty,
      revenue: Number(row.revenue.toFixed(2)),
      cost: Number(row.cost.toFixed(2)),
      profit: Number(row.profit.toFixed(2)),
    }));

    return {
      title: reportType.replace(/-/g, ' '),
      vendorName,
      generatedAt,
      columns:
        reportType === 'profit-report'
          ? [
              { key: 'item', label: 'Item' },
              { key: 'qty', label: 'Qty' },
              { key: 'revenue', label: 'Revenue' },
              { key: 'cost', label: 'Cost' },
              { key: 'profit', label: 'Profit' },
            ]
          : [
              { key: 'item', label: 'Item' },
              { key: 'qty', label: 'Qty' },
              { key: 'revenue', label: 'Revenue' },
            ],
      rows:
        reportType === 'profit-report'
          ? rows
          : rows.map((row) => ({
              item: row.item,
              qty: row.qty,
              revenue: row.revenue,
            })),
      totals: {
        qty: rows.reduce((sum, row) => sum + Number(row.qty), 0),
        revenue: rows.reduce((sum, row) => sum + Number(row.revenue), 0).toFixed(2),
        ...(reportType === 'profit-report'
          ? {
              cost: rows.reduce((sum, row) => sum + Number(row.cost), 0).toFixed(2),
              profit: rows.reduce((sum, row) => sum + Number(row.profit), 0).toFixed(2),
            }
          : {}),
      },
    };
  }

  if (reportType === 'table-wise-revenue') {
    const grouped = new Map<string, { table: string; bills: number; revenue: number }>();
    invoices.forEach((invoice) => {
      const key = invoice.tableName || 'Unknown table';
      const row = grouped.get(key) ?? { table: key, bills: 0, revenue: 0 };
      row.bills += 1;
      row.revenue += invoice.grandTotal;
      grouped.set(key, row);
    });

    const rows = [...grouped.values()].map((row) => ({
      table: row.table,
      bills: row.bills,
      revenue: Number(row.revenue.toFixed(2)),
    }));

    return {
      title: 'table wise revenue',
      vendorName,
      generatedAt,
      columns: [
        { key: 'table', label: 'Table' },
        { key: 'bills', label: 'Bills' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      totals: {
        bills: rows.reduce((sum, row) => sum + Number(row.bills), 0),
        revenue: rows.reduce((sum, row) => sum + Number(row.revenue), 0).toFixed(2),
      },
    };
  }

  if (reportType === 'customer-wise-revenue') {
    const grouped = new Map<string, { customer: string; mobile: string; visits: number; revenue: number }>();
    invoices.forEach((invoice) => {
      const key = invoice.customerSnapshot?.mobileNumber || 'walk-in';
      const row = grouped.get(key) ?? {
        customer: invoice.customerSnapshot?.customerName || 'Walk-in customer',
        mobile: invoice.customerSnapshot?.mobileNumber || '-',
        visits: 0,
        revenue: 0,
      };
      row.visits += 1;
      row.revenue += invoice.grandTotal;
      grouped.set(key, row);
    });

    const rows = [...grouped.values()].map((row) => ({
      customer: row.customer,
      mobile: row.mobile,
      visits: row.visits,
      revenue: Number(row.revenue.toFixed(2)),
    }));

    return {
      title: 'customer wise revenue',
      vendorName,
      generatedAt,
      columns: [
        { key: 'customer', label: 'Customer' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'visits', label: 'Visits' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      totals: {
        visits: rows.reduce((sum, row) => sum + Number(row.visits), 0),
        revenue: rows.reduce((sum, row) => sum + Number(row.revenue), 0).toFixed(2),
      },
    };
  }

  const groupedTax = new Map<string, { slab: string; taxable: number; tax: number; total: number }>();
  invoices.forEach((invoice) => {
    (invoice.items as ReportInvoiceItem[]).forEach((item: ReportInvoiceItem) => {
      const key = `${item.GSTPercentage}%`;
      const row = groupedTax.get(key) ?? { slab: key, taxable: 0, tax: 0, total: 0 };
      row.taxable += item.total;
      row.tax += item.GSTAmount;
      row.total += item.total + item.GSTAmount;
      groupedTax.set(key, row);
    });
  });

  const rows = [...groupedTax.values()].map((row) => ({
    slab: row.slab,
    taxable: Number(row.taxable.toFixed(2)),
    tax: Number(row.tax.toFixed(2)),
    total: Number(row.total.toFixed(2)),
  }));

  return {
    title: 'tax report',
    vendorName,
    generatedAt,
    columns: [
      { key: 'slab', label: 'GST Slab' },
      { key: 'taxable', label: 'Taxable Value' },
      { key: 'tax', label: 'Tax' },
      { key: 'total', label: 'Gross Total' },
    ],
    rows,
    totals: {
      taxable: rows.reduce((sum, row) => sum + Number(row.taxable), 0).toFixed(2),
      tax: rows.reduce((sum, row) => sum + Number(row.tax), 0).toFixed(2),
      total: rows.reduce((sum, row) => sum + Number(row.total), 0).toFixed(2),
    },
  };
}
