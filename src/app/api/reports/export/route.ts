import { NextResponse } from 'next/server';
import { buildCsv, buildExcelHtml, buildReportPdf } from '@/lib/report-export';
import { requireApiUser } from '@/lib/api-auth';
import { buildReportData } from '@/lib/reporting';
import { flattenZodError, reportFiltersSchema } from '@/lib/validations';

export async function GET(request: Request) {
  const auth = await requireApiUser(['business-admin', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = reportFiltersSchema.safeParse({
      reportType: searchParams.get('reportType'),
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      format: searchParams.get('format') || 'pdf',
    });

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    const report = await buildReportData(auth.user.tenantId, parsed.data.reportType, parsed.data.from, parsed.data.to);
    const fileSlug = parsed.data.reportType.replace(/-/g, '_');

    if (parsed.data.format === 'csv') {
      return new NextResponse(buildCsv(report), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileSlug}.csv"`,
        },
      });
    }

    if (parsed.data.format === 'excel') {
      return new NextResponse(buildExcelHtml(report), {
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileSlug}.xls"`,
        },
      });
    }

    const pdfBytes = await buildReportPdf(report);
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileSlug}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Report export error:', error);
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 });
  }
}
