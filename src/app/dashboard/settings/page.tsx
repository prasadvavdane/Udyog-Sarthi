import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';

export default async function SettingsPage() {
  const user = await requireTenantUser();
  const snapshot = await getTenantDashboardSnapshot(user);

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Workspace settings"
        title="Tenant, GST, and business context"
        description="The settings area now explains the tenant identity and active business profile more clearly for local and production testing."
        badges={[snapshot.workspace.tenantCode, snapshot.workspace.subscriptionPlan]}
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
            <CardDescription>Core information that should always be visible while testing and configuring a tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Business name', snapshot.workspace.businessName],
              ['GSTIN', snapshot.workspace.gstin],
              ['Phone', snapshot.workspace.phone],
              ['Email', snapshot.workspace.email],
              ['Branch ID', snapshot.workspace.branchId],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-[24px] border border-border bg-white/68 px-4 py-4">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testing notes</CardTitle>
            <CardDescription>Configuration guidance that makes local validation smoother.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              'Tenant codes are now accepted in sign-in so testers do not need Mongo ObjectIds.',
              'Dashboard and POS pages load tenant-aware data directly from the server for cleaner flow.',
              'Seeded demo tenants come with business-admin and billing-staff roles ready to use locally.',
            ].map((note) => (
              <div key={note} className="rounded-[24px] border border-border bg-white/68 px-4 py-4 text-sm leading-7 text-muted-foreground">
                {note}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Badge>{snapshot.templateMeta.label}</Badge>
              <Badge variant="outline">{snapshot.templateMeta.emphasis}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
