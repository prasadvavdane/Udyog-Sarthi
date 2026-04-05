import { NextResponse } from 'next/server';
import Invoice from '@/models/Invoice';
import Settings from '@/models/Settings';
import dbConnect from '@/lib/mongodb';
import { buildRestaurantInvoicePdf } from '@/lib/invoice-pdf';
import { requireApiUser } from '@/lib/api-auth';
import { getInvoiceFileName } from '@/lib/restaurant-utils';
import { serializeInvoice, serializeSettings } from '@/lib/serializers';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    await dbConnect();

    const [invoice, settings] = await Promise.all([
      Invoice.findOne({ _id: id, tenantId: auth.user.tenantId }),
      Settings.findOne({ tenantId: auth.user.tenantId }),
    ]);

    if (!invoice || !settings) {
      return NextResponse.json({ error: 'Invoice or vendor settings not found' }, { status: 404 });
    }

    const serializedInvoice = serializeInvoice(invoice);
    const serializedSettings = serializeSettings(settings);
    const pdfBytes = await buildRestaurantInvoicePdf(
      {
        ...serializedInvoice,
        createdAt: serializedInvoice.createdAt ?? new Date(),
      },
      {
        businessName: serializedSettings?.businessName || 'Restaurant POS',
        address: serializedSettings?.address || '',
        GSTIN: serializedSettings?.GSTIN || '',
        phone: serializedSettings?.phone || '',
        footerMessage: serializedSettings?.footerMessage || '',
        thankYouNote: serializedSettings?.thankYouNote || '',
      },
    );

    await Invoice.findByIdAndUpdate(invoice._id, { printedAt: new Date() });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${getInvoiceFileName(serializedInvoice)}"`,
      },
    });
  } catch (error) {
    console.error('Invoice PDF error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 });
  }
}
