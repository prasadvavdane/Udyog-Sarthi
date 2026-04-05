import { NextResponse } from 'next/server';
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
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 10,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    const report = await buildReportData(auth.user.tenantId, parsed.data.reportType, parsed.data.from, parsed.data.to);
    const startIndex = (parsed.data.page - 1) * parsed.data.pageSize;
    const rows = report.rows.slice(startIndex, startIndex + parsed.data.pageSize);

    return NextResponse.json({
      ...report,
      rows,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      totalRows: report.rows.length,
      totalPages: Math.max(Math.ceil(report.rows.length / parsed.data.pageSize), 1),
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
