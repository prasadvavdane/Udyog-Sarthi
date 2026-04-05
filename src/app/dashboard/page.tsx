import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BarChart3,
  CreditCard,
  Package,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { PaymentModeChart } from '@/components/charts/payment-mode-chart';
import { SalesOverviewChart } from '@/components/charts/sales-overview-chart';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';

export default async function DashboardPage() {
  const user = await requireTenantUser();
  const snapshot = await getTenantDashboardSnapshot(user);

  if (user.role === 'billing-staff' && snapshot.workspace.industryTemplate === 'restaurant') {
    redirect('/dashboard/pos');
  }

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Operations hub"
        title={`${snapshot.workspace.businessName} command center`}
        description={`A cleaner billing flow for ${snapshot.templateMeta.label.toLowerCase()} teams with faster checkout, clearer metrics, and a more guided day-to-day workspace.`}
        badges={[snapshot.workspace.tenantCode, snapshot.workspace.gstin, snapshot.templateMeta.emphasis]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/templates">Template playbook</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/pos">Open POS counter</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today sales" value={formatCurrency(snapshot.metrics.todaySales)} note="Fresh view of today's billing momentum." icon={Wallet} />
        <StatCard label="Month revenue" value={formatCurrency(snapshot.metrics.monthRevenue)} note="Month-to-date gross collections." icon={TrendingUp} />
        <StatCard label="Inventory pulse" value={`${formatNumber(snapshot.inventory.lowStock)} low stock`} note={`${formatNumber(snapshot.inventory.outOfStock)} items out of stock right now.`} icon={Package} />
        <StatCard label="Customers" value={formatNumber(snapshot.metrics.totalCustomers)} note={`${formatNumber(snapshot.metrics.activeOffers)} active offers and loyalty hooks.`} icon={Users} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sales and profit trend</CardTitle>
            <CardDescription>Seven-day revenue rhythm with profit visibility.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesOverviewChart data={snapshot.salesTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment mode mix</CardTitle>
            <CardDescription>See where cash, UPI, and card collections are landing.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] xl:grid-cols-1">
            <PaymentModeChart data={snapshot.paymentSplit} />
            <div className="space-y-3">
              {snapshot.paymentSplit.map((payment) => (
                <div key={payment.name} className="flex items-center justify-between rounded-2xl border border-border bg-white/65 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold capitalize text-foreground">{payment.name}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Collected</p>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground">{formatCurrency(payment.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Recent invoices</CardTitle>
              <CardDescription>Track the latest collections without leaving the dashboard.</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/invoices">See all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex flex-col gap-3 rounded-[24px] border border-border bg-white/68 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(invoice.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={invoice.paymentStatus === 'paid' ? 'default' : 'outline'}>{invoice.paymentStatus}</Badge>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(invoice.grandTotal)}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{invoice.paymentMode ?? 'cash'}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template guidance</CardTitle>
            <CardDescription>What the current layout is optimized for in this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[26px] border border-border bg-white/68 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{snapshot.templateMeta.label}</Badge>
                <Badge variant="outline">{snapshot.templateMeta.emphasis}</Badge>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{snapshot.templateMeta.summary}</p>
            </div>
            <div className="grid gap-3">
              {snapshot.templateMeta.modules.map((module) => (
                <div key={module} className="flex items-center gap-3 rounded-2xl border border-border bg-white/68 px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{module}</p>
                    <p className="text-sm text-muted-foreground">Highlighted in the redesigned flow.</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Top customers</CardTitle>
            <CardDescription>High-value repeat buyers and loyalty context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.customerList.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between rounded-[24px] border border-border bg-white/68 px-4 py-4">
                <div>
                  <p className="font-semibold text-foreground">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">{customer.mobile}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{customer.tier}</Badge>
                  <p className="mt-2 font-semibold text-foreground">{formatCurrency(customer.totalSpend)}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{formatNumber(customer.loyaltyPoints)} points</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ready next actions</CardTitle>
            <CardDescription>The redesigned workspace keeps the most common jobs one click away.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              { title: 'Start POS billing', description: 'Use the new faster counter layout.', href: '/dashboard/pos', icon: ShoppingCart },
              { title: 'Review analytics', description: 'Check revenue, profit and trends.', href: '/dashboard/analytics', icon: BarChart3 },
              { title: 'Manage products', description: 'Adjust stock, pricing and GST.', href: '/dashboard/products', icon: Package },
              { title: 'See customers', description: 'Follow loyalty and repeat visits.', href: '/dashboard/customers', icon: Users },
            ].map((action) => (
              <Button key={action.title} asChild variant="outline" className="h-auto justify-start rounded-[24px] p-4">
                <Link href={action.href}>
                  <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <action.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{action.title}</p>
                    <p className="text-sm font-normal leading-6 text-muted-foreground">{action.description}</p>
                  </div>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
