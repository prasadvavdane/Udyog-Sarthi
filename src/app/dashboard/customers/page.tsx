import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';

export default async function CustomersPage() {
  const user = await requireTenantUser();
  const snapshot = await getTenantDashboardSnapshot(user);

  const highestSpend = snapshot.customerList[0]?.totalSpend ?? 0;
  const averageSpend = snapshot.metrics.totalCustomers > 0 ? snapshot.metrics.totalRevenue / snapshot.metrics.totalCustomers : 0;

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="CRM and loyalty"
        title="Customer relationships made easier to scan"
        description=""
        // badges={[`${formatNumber(snapshot.metrics.totalCustomers)} total customers`, `${formatCurrency(highestSpend)} top spend`]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Repeat customer base', value: snapshot.metrics.totalCustomers, note: 'Profiles available for follow-up' },
          { label: 'Average spend', value: averageSpend, note: 'Revenue per customer reference' },
          { label: 'Top wallet share', value: highestSpend, note: 'Best performing customer account' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5 md:p-6">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {item.label === 'Repeat customer base' ? formatNumber(Number(item.value)) : formatCurrency(Number(item.value))}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Top customer tiers</CardTitle>
            <CardDescription>Retention indicators are elevated so they feel actionable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.customerList.map((customer) => (
              <div key={customer.id} className="rounded-[24px] border border-border bg-white/68 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.mobile}</p>
                  </div>
                  <Badge variant="outline">{customer.tier}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Lifetime spend</span>
                  <span className="font-semibold text-foreground">{formatCurrency(customer.totalSpend)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Loyalty points</span>
                  <span className="font-semibold text-foreground">{formatNumber(customer.loyaltyPoints)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last visit</span>
                  <span className="font-semibold text-foreground">
                    {customer.lastVisitDate ? formatDate(customer.lastVisitDate) : 'Recently added'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer insight summary</CardTitle>
            <CardDescription>The UI now tells a clearer story before you export or dive deeper.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              'Capture walk-ins by mobile number at billing time.',
              'Use loyalty points as a repeat-visit prompt at checkout.',
              'Highlight top spenders for personalized offers.',
              'Use tier badges to inform staff interactions and upsell focus.',
            ].map((insight) => (
              <div key={insight} className="rounded-[24px] border border-border bg-white/68 px-4 py-4 text-sm leading-7 text-muted-foreground">
                {insight}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
