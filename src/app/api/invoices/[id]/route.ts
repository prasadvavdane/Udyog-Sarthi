import { NextResponse } from 'next/server';
import Invoice from '@/models/Invoice';
import Settings from '@/models/Settings';
import RestaurantTable from '@/models/RestaurantTable';
import dbConnect from '@/lib/mongodb';
import { requireApiUser } from '@/lib/api-auth';
import { serializeInvoice, serializeSettings, serializeTable } from '@/lib/serializers';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    await dbConnect();

    const [invoice, settings, table] = await Promise.all([
      Invoice.findOne({ _id: id, tenantId: auth.user.tenantId }),
      Settings.findOne({ tenantId: auth.user.tenantId }),
      RestaurantTable.findOne({ tenantId: auth.user.tenantId, lastInvoiceId: id }),
    ]);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      invoice: serializeInvoice(invoice),
      settings: serializeSettings(settings),
      table: table ? serializeTable(table) : null,
    });
  } catch (error) {
    console.error('Invoice detail error:', error);
    return NextResponse.json({ error: 'Failed to load invoice' }, { status: 500 });
  }
}
