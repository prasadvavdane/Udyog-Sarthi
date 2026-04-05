import { NextResponse } from 'next/server';
import Invoice from '@/models/Invoice';
import RestaurantTable from '@/models/RestaurantTable';
import dbConnect from '@/lib/mongodb';
import { requireApiUser } from '@/lib/api-auth';
import { serializeInvoice } from '@/lib/serializers';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(['business-admin', 'billing-staff', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    await dbConnect();

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, tenantId: auth.user.tenantId },
      { invoiceStatus: 'closed', closedAt: new Date() },
      { new: true },
    );

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    await RestaurantTable.findByIdAndUpdate(invoice.tableId, {
      status: 'available',
      sessionId: undefined,
      activeInvoiceDraftId: undefined,
      lastInvoiceId: invoice._id.toString(),
    });

    return NextResponse.json({ invoice: serializeInvoice(invoice) });
  } catch (error) {
    console.error('Invoice close error:', error);
    return NextResponse.json({ error: 'Failed to close invoice' }, { status: 500 });
  }
}
