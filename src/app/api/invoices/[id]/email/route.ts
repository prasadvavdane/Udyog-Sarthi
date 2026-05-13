import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { buildInvoicePdfContext, sendInvoicePdfEmail } from '@/lib/invoice-delivery';
import { normalizePdfFileName } from '@/lib/restaurant-utils';
import { emailInvoicePdfSchema, flattenZodError } from '@/lib/validations';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    const payload = (await request.json()) as { fileName?: string };
    const parsed = emailInvoicePdfSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    const { id } = await params;
    const invoiceContext = await buildInvoicePdfContext(id, auth.user.tenantId);

    if (!invoiceContext) {
      return NextResponse.json({ error: 'Invoice or vendor settings not found' }, { status: 404 });
    }

    const delivery = await sendInvoicePdfEmail({
      fileName: normalizePdfFileName(parsed.data.fileName, invoiceContext.defaultFileName),
      invoice: invoiceContext.invoice,
      settings: invoiceContext.settings,
      pdfBytes: invoiceContext.pdfBytes,
    });

    return NextResponse.json({
      success: true,
      recipientEmail: delivery.recipientEmail,
      fileName: delivery.fileName,
    });
  } catch (error) {
    console.error('Invoice email error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invoice email' },
      { status: 500 },
    );
  }
}
