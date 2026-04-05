import { NextResponse } from 'next/server';
import Customer from '@/models/Customer';
import Invoice from '@/models/Invoice';
import Product from '@/models/Product';
import RestaurantTable from '@/models/RestaurantTable';
import dbConnect from '@/lib/mongodb';
import { requireApiUser } from '@/lib/api-auth';
import { buildCustomerSnapshot, buildGstBreakup, buildInvoiceItems, calculateInvoiceTotals, createDraftId, createSessionId } from '@/lib/restaurant-utils';
import { serializeInvoice, serializeTable } from '@/lib/serializers';
import { draftInvoiceSchema, flattenZodError } from '@/lib/validations';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    await dbConnect();

    const table = await RestaurantTable.findOne({ _id: id, tenantId: auth.user.tenantId });
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const draft = await Invoice.findOne({
      tenantId: auth.user.tenantId,
      tableId: id,
      invoiceStatus: { $in: ['draft', 'active', 'paid'] },
    }).sort({ updatedAt: -1 });

    return NextResponse.json({
      table: serializeTable(table),
      draft: draft ? serializeInvoice(draft) : null,
    });
  } catch (error) {
    console.error('Draft fetch error:', error);
    return NextResponse.json({ error: 'Failed to load draft' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(['business-admin', 'billing-staff', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = draftInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    await dbConnect();

    const table = await RestaurantTable.findOne({ _id: id, tenantId: auth.user.tenantId, isActive: true });
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const productIds = parsed.data.items.map((item) => item.productId);
    const products = await Product.find({
      tenantId: auth.user.tenantId,
      _id: { $in: productIds },
      activeStatus: true,
    });

    const invoiceItems = buildInvoiceItems(parsed.data.items, products);
    const totals = calculateInvoiceTotals(invoiceItems, parsed.data.discount);
    const GSTBreakup = buildGstBreakup(invoiceItems);

    let customerId = parsed.data.customerId;
    let customerSnapshot = buildCustomerSnapshot(parsed.data.customer, parsed.data.customerId);

    if (parsed.data.customer) {
      const customer = await Customer.findOneAndUpdate(
        {
          tenantId: auth.user.tenantId,
          mobile: parsed.data.customer.mobileNumber,
        },
        {
          tenantId: auth.user.tenantId,
          businessId: auth.user.businessId,
          branchId: auth.user.branchId,
          createdBy: auth.user.id,
          name: parsed.data.customer.customerName,
          mobile: parsed.data.customer.mobileNumber,
          email: parsed.data.customer.email || undefined,
          numberOfGuests: parsed.data.customer.numberOfGuests,
          specialNotes: parsed.data.customer.specialNotes || undefined,
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      );

      customerId = customer._id.toString();
      customerSnapshot = buildCustomerSnapshot(parsed.data.customer, customerId);
    }

    let draft = await Invoice.findOne({
      tenantId: auth.user.tenantId,
      tableId: id,
      invoiceStatus: { $in: ['draft', 'active'] },
    }).sort({ updatedAt: -1 });

    const sessionId = draft?.sessionId ?? table.sessionId ?? createSessionId(table.tableName);
    const invoiceDraftId = draft?.invoiceDraftId ?? parsed.data.invoiceDraftId ?? createDraftId(table.tableName);

    if (!draft) {
      draft = await Invoice.create({
        tenantId: auth.user.tenantId,
        businessId: auth.user.businessId,
        branchId: auth.user.branchId,
        createdBy: auth.user.id,
        invoiceNumber: invoiceDraftId,
        invoiceDraftId,
        tableId: table._id.toString(),
        tableName: table.tableName,
        sessionId,
        customerId,
        customerSnapshot,
        items: invoiceItems,
        subtotal: totals.subtotal,
        discount: parsed.data.discount,
        GSTAmount: totals.GSTAmount,
        grandTotal: totals.grandTotal,
        invoiceStatus: invoiceItems.length > 0 ? 'active' : 'draft',
        paymentStatus: 'pending',
        notes: parsed.data.notes || undefined,
        GSTBreakup,
      });
    } else {
      draft = await Invoice.findByIdAndUpdate(
        draft._id,
        {
          customerId,
          customerSnapshot,
          items: invoiceItems,
          subtotal: totals.subtotal,
          discount: parsed.data.discount,
          GSTAmount: totals.GSTAmount,
          grandTotal: totals.grandTotal,
          invoiceStatus: invoiceItems.length > 0 ? 'active' : 'draft',
          notes: parsed.data.notes || undefined,
          GSTBreakup,
          sessionId,
        },
        { new: true },
      );
    }

    await RestaurantTable.findByIdAndUpdate(table._id, {
      status: invoiceItems.length > 0 ? 'occupied' : table.status === 'reserved' ? 'reserved' : 'available',
      sessionId,
      activeInvoiceDraftId: draft?._id.toString(),
    });

    return NextResponse.json({ draft: draft ? serializeInvoice(draft) : null });
  } catch (error) {
    console.error('Draft save error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save draft' }, { status: 500 });
  }
}
