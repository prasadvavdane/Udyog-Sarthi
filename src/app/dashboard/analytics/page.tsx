import { PaymentModeChart } from '@/components/charts/payment-mode-chart';
import { SalesOverviewChart } from '@/components/charts/sales-overview-chart';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/format';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';

export default async function AnalyticsPage() {
  const user = await requireTenantUser();
  const snapshot = await getTenantDashboardSnapshot(user);

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Analytics"
        title="Revenue, profit, and product movement"
        description="Charts now anchor the story visually so finance and operations can understand what changed without reading dense exports first."
        badges={[`${formatCurrency(snapshot.metrics.totalRevenue)} total revenue`, `${formatCurrency(snapshot.metrics.totalProfit)} total profit`]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sales trend</CardTitle>
            <CardDescription>Daily sales and profit in a single visual lane.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesOverviewChart data={snapshot.salesTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment distribution</CardTitle>
            <CardDescription>See which tender types dominate checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentModeChart data={snapshot.paymentSplit} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Best sellers</CardTitle>
          <CardDescription>The redesigned table keeps sold quantity, revenue, and remaining stock aligned.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Sold qty</th>
                <th className="pb-3 font-medium">Revenue</th>
                <th className="pb-3 font-medium">Stock left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {snapshot.topProducts.map((product) => (
                <tr key={product.id}>
                  <td className="py-4 font-semibold text-foreground">{product.name}</td>
                  <td className="py-4 text-muted-foreground">{product.category}</td>
                  <td className="py-4 text-foreground">{formatNumber(product.sold)}</td>
                  <td className="py-4 text-foreground">{formatCurrency(product.revenue)}</td>
                  <td className="py-4 text-muted-foreground">{formatNumber(product.stockQuantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
