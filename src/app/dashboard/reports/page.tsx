import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';

export default async function ReportsPage() {
  const user = await requireTenantUser();
  const snapshot = await getTenantDashboardSnapshot(user);

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Reports"
        title="Exports and compliance packs"
        description="The reporting area now explains what each export is for before a user has to guess which file they need."
        badges={[snapshot.workspace.gstin, snapshot.templateMeta.label]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { title: 'GST report', description: 'Taxable value, GST breakup, and slab-wise summary for filing.', formats: ['PDF', 'CSV', 'Excel'] },
          { title: 'Sales report', description: 'Daily, weekly, monthly and yearly revenue breakdowns.', formats: ['PDF', 'CSV', 'Excel'] },
          { title: 'Profit report', description: 'Selling vs buying spread and margin review by product.', formats: ['PDF', 'CSV'] },
          { title: 'Inventory report', description: 'In stock, low stock and fast-moving inventory snapshot.', formats: ['PDF', 'CSV', 'Excel'] },
          { title: 'Loyalty report', description: 'Customer points, redeems and repeat purchase behavior.', formats: ['PDF', 'CSV'] },
          { title: 'Customer report', description: 'Lifetime value, last visit and top customer ranking.', formats: ['PDF', 'CSV', 'Excel'] },
        ].map((report) => (
          <Card key={report.title}>
            <CardHeader>
              <CardTitle>{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {report.formats.map((format) => (
                  <Badge key={format} variant="outline">
                    {format}
                  </Badge>
                ))}
              </div>
              <Button variant="outline" className="w-full justify-between">
                Prepare export
                <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Soon</span>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
