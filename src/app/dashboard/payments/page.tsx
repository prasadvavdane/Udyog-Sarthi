import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';

export default async function PaymentsPage() {
  const user = await requireTenantUser();
  const snapshot = await getTenantDashboardSnapshot(user);

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Payments"
        title="Settlement visibility by payment mode"
        description=""
        // badges={[`${formatCurrency(snapshot.metrics.pendingPayments)} pending`, `${snapshot.paymentSplit.length} payment channels`]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {snapshot.paymentSplit.map((payment) => (
          <Card key={payment.name}>
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground capitalize">{payment.name}</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{formatCurrency(payment.value)}</p>
                </div>
                <Badge variant="outline">Collected</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Recent completed settlement amount for this mode.</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection notes</CardTitle>
          <CardDescription>Operational cues for the team as they reconcile cash, UPI and card flows.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            'Use the POS shortcuts for faster tender selection at the counter.',
            'Pending payment totals stay visible on dashboard and invoice screens.',
            'UPI transactions are marked with generated reference IDs for local testing.',
          ].map((note) => (
            <div key={note} className="rounded-[24px] border border-border bg-white/68 px-4 py-4 text-sm leading-7 text-muted-foreground">
              {note}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
