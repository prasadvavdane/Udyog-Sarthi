import { ReportsCenter } from '@/components/reports-center';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { buildReportData } from '@/lib/reporting';
import { getWorkspaceSummary } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function ReportsPage() {
  const user = await requireTenantUser();
  const canViewReports = ['business-admin', 'super-admin'].includes(user.role);
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  from.setHours(0, 0, 0, 0);

  const [workspace, initialReport] = await Promise.all([
    getWorkspaceSummary(user),
    buildReportData(user.tenantId, 'daily-sales', formatDateInput(from), formatDateInput(to)),
  ]);

  const pageSize = 10;

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Reports"
        title="Operational and compliance reports"
        description=""
        // badges={[workspace.tenantCode, workspace.gstin, workspace.businessName]}
      />

      {canViewReports ? (
        <ReportsCenter
          initialReport={{
            ...initialReport,
            rows: initialReport.rows.slice(0, pageSize),
            page: 1,
            pageSize,
            totalRows: initialReport.rows.length,
            totalPages: Math.max(Math.ceil(initialReport.rows.length / pageSize), 1),
          }}
          initialReportType="daily-sales"
          initialFrom={formatDateInput(from)}
          initialTo={formatDateInput(to)}
        />
      ) : (
        <Card>
          <CardContent className="p-6 text-sm leading-7 text-muted-foreground">
            Reports are available to business admins. Billing staff can continue using the table POS and invoice history screens.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
