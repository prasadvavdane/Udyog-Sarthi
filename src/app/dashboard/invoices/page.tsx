import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { getWorkspaceSummary } from '@/lib/dashboard-data';
import { getRestaurantInvoiceHistory } from '@/lib/restaurant-data';
import { serializeInvoice } from '@/lib/serializers';
import { requireTenantUser } from '@/lib/server-auth';

export default async function InvoicesPage() {
  const user = await requireTenantUser();
  const [workspace, invoices] = await Promise.all([
    getWorkspaceSummary(user),
    getRestaurantInvoiceHistory(user),
  ]);

  const serializedInvoices = invoices.map(serializeInvoice);
  const paidInvoices = serializedInvoices.filter((invoice) => invoice.paymentStatus === 'paid').length;
  const pendingAmount = serializedInvoices
    .filter((invoice) => invoice.paymentStatus !== 'paid')
    .reduce((sum, invoice) => sum + invoice.grandTotal, 0);
  const totalRevenue = serializedInvoices.reduce((sum, invoice) => sum + invoice.grandTotal, 0);

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Invoice history"
        title="Exact bill reopen and print history"
        description="Every finalized restaurant bill now reopens with the same table, customer, item lines, taxes, totals, and payment mode that were captured during billing."
        badges={[workspace.tenantCode, `${formatNumber(serializedInvoices.length)} invoices`, `${formatCurrency(totalRevenue)} revenue`]}
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/reports">
              Reports
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Finalized invoices', value: formatNumber(serializedInvoices.length), note: 'Completed dine-in and table bills' },
          { label: 'Paid invoices', value: formatNumber(paidInvoices), note: 'Completed collections in the current list' },
          { label: 'Pending amount', value: formatCurrency(pendingAmount), note: 'Bills awaiting complete settlement' },
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

      <div className="grid gap-3">
        {serializedInvoices.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm leading-7 text-muted-foreground">
              No finalized invoices yet. Settle a table bill from the POS screen and it will appear here with exact reopen and print support.
            </CardContent>
          </Card>
        ) : (
          serializedInvoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/dashboard/invoices/${invoice.id}`}
              className="rounded-[28px] border border-border bg-white/72 p-5 shadow-sm transition hover:border-primary/25 hover:bg-white"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.tableName} - {invoice.customerSnapshot?.customerName || 'Walk-in customer'}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatDate(invoice.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={invoice.paymentStatus === 'paid' ? 'default' : 'outline'}>{invoice.paymentStatus}</Badge>
                  <Badge variant="outline">{invoice.paymentMode || 'pending'}</Badge>
                  <Badge variant="outline">{invoice.invoiceStatus}</Badge>
                  <p className="font-semibold text-foreground">{formatCurrency(invoice.grandTotal)}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
