import { NextResponse } from 'next/server';
import Invoice from '@/models/Invoice';
import { requireApiUser } from '@/lib/api-auth';
import { buildInvoicePdfContext } from '@/lib/invoice-delivery';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const invoiceContext = await buildInvoicePdfContext(id, auth.user.tenantId);
    if (!invoiceContext) {
      return NextResponse.json({ error: 'Invoice or vendor settings not found' }, { status: 404 });
    }

    await Invoice.findByIdAndUpdate(invoiceContext.invoice.id, { printedAt: new Date() });

    return new NextResponse(Buffer.from(invoiceContext.pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoiceContext.defaultFileName}"`,
      },
    });
  } catch (error) {
    console.error('Invoice PDF error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 });
  }
}
