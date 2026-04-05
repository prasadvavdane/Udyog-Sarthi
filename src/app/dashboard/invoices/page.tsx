import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';

export default async function InvoicesPage() {
  const user = await requireTenantUser();
  const snapshot = await getTenantDashboardSnapshot(user);

  const paidInvoices = snapshot.recentInvoices.filter((invoice) => invoice.paymentStatus === 'paid').length;

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Collections"
        title="Invoices with a cleaner settlement story"
        description="Recent bills, statuses, and totals now sit in one place so the transition from billing to follow-up feels much simpler."
        badges={[`${formatNumber(snapshot.recentInvoices.length)} recent invoices`, `${formatCurrency(snapshot.metrics.pendingPayments)} pending collections`]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Recent invoices', value: formatNumber(snapshot.recentInvoices.length), note: 'Latest billing activity in this tenant' },
          { label: 'Paid invoices', value: formatNumber(paidInvoices), note: 'Completed collections in the current list' },
          { label: 'Pending amount', value: formatCurrency(snapshot.metrics.pendingPayments), note: 'Follow-up cash still outstanding' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5 md:p-6">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{item.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice feed</CardTitle>
          <CardDescription>A simpler layout for reviewing payment progress and bill history.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.recentInvoices.map((invoice) => (
            <div key={invoice.id} className="flex flex-col gap-3 rounded-[24px] border border-border bg-white/68 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{invoice.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">{formatDate(invoice.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={invoice.paymentStatus === 'paid' ? 'default' : 'outline'}>{invoice.paymentStatus}</Badge>
                <Badge variant="outline">{invoice.paymentMode ?? 'cash'}</Badge>
                <p className="font-semibold text-foreground">{formatCurrency(invoice.grandTotal)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
