import { NextResponse } from 'next/server';
import Customer from '@/models/Customer';
import Inventory from '@/models/Inventory';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import Product from '@/models/Product';
import RestaurantTable from '@/models/RestaurantTable';
import Settings from '@/models/Settings';
import dbConnect from '@/lib/mongodb';
import { requireApiUser } from '@/lib/api-auth';
import { createInvoiceNumber } from '@/lib/restaurant-utils';
import { serializeInvoice } from '@/lib/serializers';
import { finalizeInvoiceSchema, flattenZodError } from '@/lib/validations';

type InvoiceLineItem = {
  productId: string;
  productName: string;
  quantity: number;
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

    for (const item of invoiceItems) {
      const product = await Product.findOne({
        _id: item.productId,
        tenantId: auth.user.tenantId,
      });

      if (!product) {
        return NextResponse.json({ error: `Product ${item.productName} no longer exists` }, { status: 400 });
      }

      if (product.stockQuantity < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${item.productName}` }, { status: 400 });
      }
    }

    const settings = await Settings.findOne({ tenantId: auth.user.tenantId });
    const invoiceNumber = createInvoiceNumber(settings?.invoicePrefix ?? 'INV');
    const paymentAmount = parsed.data.paymentAmount ?? invoice.grandTotal;
    const paymentStatus = paymentAmount >= invoice.grandTotal ? 'paid' : paymentAmount > 0 ? 'partial' : 'pending';

    const finalizedInvoice = await Invoice.findByIdAndUpdate(
      invoice._id,
      {
        invoiceNumber,
        invoiceStatus: 'paid',
        paymentStatus,
        paymentMode: parsed.data.paymentMode,
      },
      { new: true },
    );

    await Promise.all(
      invoiceItems.map(async (item: InvoiceLineItem) => {
        const product = await Product.findByIdAndUpdate(
          item.productId,
          {
            $inc: { stockQuantity: -item.quantity },
          },
          { new: true },
        );

        if (product) {
          const remainingStock = Math.max(product.stockQuantity, 0);
          await Product.findByIdAndUpdate(item.productId, {
            isAvailable: remainingStock > 0,
          });
        }

        await Inventory.create({
          tenantId: auth.user.tenantId,
          businessId: auth.user.businessId,
          branchId: auth.user.branchId,
          createdBy: auth.user.id,
          productId: item.productId,
          quantity: -item.quantity,
          type: 'out',
          reason: 'Restaurant bill',
          reference: finalizedInvoice?._id.toString(),
        });
      }),
    );

    if (invoice.customerId) {
      const pointsEarned = Math.floor(invoice.grandTotal * 0.01);
      await Customer.findByIdAndUpdate(invoice.customerId, {
        $inc: {
          totalSpend: invoice.grandTotal,
          loyaltyPoints: pointsEarned,
        },
        lastVisitDate: new Date(),
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
