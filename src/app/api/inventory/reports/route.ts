import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { buildInventoryReportData } from '@/lib/inventory-reporting';
import { hasInventoryPermission } from '@/lib/inventory-permissions';
import { inventoryReportFiltersSchema } from '@/lib/inventory-validations';
import { flattenZodError } from '@/lib/validations';

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  if (!hasInventoryPermission(auth.user.role, 'inventory.report.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsed = inventoryReportFiltersSchema.safeParse({
      reportType: searchParams.get('reportType'),
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 10,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    const report = await buildInventoryReportData(
      auth.user.tenantId,
      auth.user.branchId,
      parsed.data.reportType,
      parsed.data.from,
      parsed.data.to,
    );
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
    console.error('Inventory report error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate inventory report' },
      { status: 500 },
    );
  }
}
