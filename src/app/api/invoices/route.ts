import { NextResponse } from 'next/server';
import Customer from '@/models/Customer';
import Invoice from '@/models/Invoice';
import InventoryRecipe from '@/models/InventoryRecipe';
import Payment from '@/models/Payment';
import Product from '@/models/Product';
import RestaurantTable from '@/models/RestaurantTable';
import Settings from '@/models/Settings';
import { postInventoryForSale } from '@/lib/inventory-service';
import dbConnect from '@/lib/mongodb';
import { requireApiUser } from '@/lib/api-auth';
import { createInvoiceNumber } from '@/lib/restaurant-utils';
import { serializeInvoice } from '@/lib/serializers';
import { finalizeInvoiceSchema, flattenZodError } from '@/lib/validations';

type InvoiceLineItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
};

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    await dbConnect();
    const filter: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    };

    if (status === 'draft') {
      filter.invoiceStatus = { $in: ['draft', 'active', 'paid'] };
    } else {
      filter.invoiceStatus = { $in: ['paid', 'closed'] };
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ invoices: invoices.map(serializeInvoice) });
  } catch (error) {
    console.error('Invoices fetch error:', error);
    return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser(['business-admin', 'billing-staff', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const parsed = finalizeInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    await dbConnect();

    const invoice = await Invoice.findOne({
      tenantId: auth.user.tenantId,
      invoiceDraftId: parsed.data.draftId,
      invoiceStatus: { $in: ['draft', 'active'] },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Draft invoice not found' }, { status: 404 });
    }

    const invoiceItems = invoice.items as InvoiceLineItem[];

    if (!invoiceItems.length) {
      return NextResponse.json({ error: 'Cannot finalize an empty invoice' }, { status: 400 });
    }

    const productIds = invoiceItems.map((item) => item.productId);
    const [products, recipes, settings] = await Promise.all([
      Product.find({
        _id: { $in: productIds },
        tenantId: auth.user.tenantId,
      }),
      InventoryRecipe.find({
        tenantId: auth.user.tenantId,
        branchId: auth.user.branchId,
        productId: { $in: productIds },
        isActive: true,
      }),
      Settings.findOne({ tenantId: auth.user.tenantId }),
    ]);

    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    const recipeTrackedProductIds = new Set(recipes.map((recipe) => recipe.productId));

    for (const item of invoiceItems) {
      const product = productMap.get(item.productId);

      if (!product) {
        return NextResponse.json({ error: `Product ${item.productName} no longer exists` }, { status: 400 });
      }

      if (!recipeTrackedProductIds.has(item.productId) && product.stockQuantity < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${item.productName}` }, { status: 400 });
      }
    }

    const invoiceNumber = createInvoiceNumber(settings?.invoicePrefix ?? 'INV');
    const billedAt = new Date();
    const paymentAmount = parsed.data.paymentAmount ?? invoice.grandTotal;
    const paymentStatus = paymentAmount >= invoice.grandTotal ? 'paid' : paymentAmount > 0 ? 'partial' : 'pending';

    const inventoryPosting = await postInventoryForSale(auth.user, {
      invoiceId: invoice._id.toString(),
      invoiceNumber,
      soldItems: invoiceItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
      })),
    });

    await Promise.all(
      invoiceItems
        .filter((item) => !inventoryPosting.recipeTrackedProductIds.has(item.productId))
        .map(async (item) => {
          const product = await Product.findOneAndUpdate(
            {
              _id: item.productId,
              tenantId: auth.user.tenantId,
              stockQuantity: { $gte: item.quantity },
            },
            {
              $inc: { stockQuantity: -item.quantity },
            },
            { returnDocument: 'after' },
          );

          if (!product) {
            throw new Error(`Insufficient stock for ${item.productName}`);
          }

          const remainingStock = Math.max(product.stockQuantity, 0);
          await Product.findByIdAndUpdate(item.productId, {
            isAvailable: remainingStock > 0,
          });
        }),
    );

    const finalizedItems = (invoice.items as Array<InvoiceLineItem & { GSTPercentage: number; GSTAmount: number; category?: string; foodType?: string }>)
      .map((item) => {
        const product = productMap.get(item.productId);
        const directProductCost = (product?.buyingPrice ?? 0) * item.quantity;
        const inventoryCost = inventoryPosting.recipeTrackedProductIds.has(item.productId)
          ? inventoryPosting.costByProductId.get(item.productId) ?? 0
          : directProductCost;
        const margin = Number((item.total - inventoryCost).toFixed(2));
        const baseItem =
          typeof item === 'object' && item !== null && 'toObject' in item && typeof item.toObject === 'function'
            ? item.toObject()
            : item;

        return {
          ...baseItem,
          inventoryCost: Number(inventoryCost.toFixed(2)),
          margin,
        };
      });

    const inventoryCostTotal = finalizedItems.reduce((sum, item) => sum + Number(item.inventoryCost ?? 0), 0);
    const grossProfit = finalizedItems.reduce((sum, item) => sum + Number(item.margin ?? 0), 0);

    const finalizedInvoice = await Invoice.findByIdAndUpdate(
      invoice._id,
      {
        invoiceNumber,
        invoiceStatus: 'paid',
        paymentStatus,
        paymentMode: parsed.data.paymentMode,
        billedAt,
        items: finalizedItems,
        inventoryCostTotal: Number(inventoryCostTotal.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2)),
      },
      { returnDocument: 'after' },
    );

    if (invoice.customerId) {
      const pointsEarned = Math.floor(invoice.grandTotal * 0.01);
      await Customer.findByIdAndUpdate(invoice.customerId, {
        $inc: {
          totalSpend: invoice.grandTotal,
          loyaltyPoints: pointsEarned,
        },
        lastVisitDate: billedAt,
      });
    }

    await Payment.create({
      tenantId: auth.user.tenantId,
      businessId: auth.user.businessId,
      branchId: auth.user.branchId,
      createdBy: auth.user.id,
      invoiceId: invoice._id.toString(),
      amount: paymentAmount,
      paymentMode: parsed.data.paymentMode,
      status: paymentStatus === 'pending' ? 'pending' : 'completed',
      transactionId: parsed.data.paymentMode === 'upi' ? `UPI-${Date.now()}` : undefined,
      timestamp: billedAt,
    });

    await RestaurantTable.findByIdAndUpdate(invoice.tableId, {
      status: 'billed',
      lastInvoiceId: invoice._id.toString(),
      activeInvoiceDraftId: undefined,
    });

    return NextResponse.json({ invoice: finalizedInvoice ? serializeInvoice(finalizedInvoice) : null });
  } catch (error) {
    console.error('Invoice finalize error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to finalize invoice' }, { status: 500 });
  }
}
