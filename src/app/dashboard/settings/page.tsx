import { SettingsForm } from '@/components/settings-form';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getRestaurantSettings } from '@/lib/restaurant-data';
import { getWorkspaceSummary } from '@/lib/dashboard-data';
import { serializeSettings } from '@/lib/serializers';
import { requireTenantUser } from '@/lib/server-auth';

export default async function SettingsPage() {
  const user = await requireTenantUser();
  const canManage = ['business-admin', 'super-admin'].includes(user.role);
  const [workspace, settings] = await Promise.all([
    getWorkspaceSummary(user),
    getRestaurantSettings(user),
  ]);

  const serializedSettings = serializeSettings(settings) ?? {
    businessName: workspace.businessName,
    GSTIN: '',
    address: '',
    phone: '',
    email: user.email ?? '',
    logo: '',
    footerMessage: '',
    thankYouNote: '',
    invoicePrefix: 'INV',
    defaultGST: 5,
  };

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Vendor settings"
        title="Header, footer, GST, and print identity"
        description="Everything configured here flows automatically into the on-screen invoice, downloaded PDF bill, report exports, and printed receipt."
        badges={[workspace.tenantCode, workspace.subscriptionPlan]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        {canManage ? <SettingsForm initialSettings={serializedSettings} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>Current vendor profile</CardTitle>
            <CardDescription>This is the branding block the billing and reports workflow now reuses everywhere.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Business name', serializedSettings.businessName],
              ['GSTIN', serializedSettings.GSTIN || 'Not configured'],
              ['Phone', serializedSettings.phone || 'Not configured'],
              ['Email', serializedSettings.email || 'Not configured'],
              ['Invoice prefix', serializedSettings.invoicePrefix],
              ['Default GST', `${serializedSettings.defaultGST}%`],
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
            <CardTitle>Print and export behavior</CardTitle>
            <CardDescription>These values are reused without extra manual input in every business-critical flow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              'Vendor name, GSTIN, address, and phone appear in the invoice header and the PDF bill.',
              'Footer message and thank-you note appear in the printed receipt and invoice preview.',
              'Invoice prefix controls the final bill number generated when a draft table order is settled.',
            ].map((note) => (
              <div key={note} className="rounded-[24px] border border-border bg-white/68 px-4 py-4 text-sm leading-7 text-muted-foreground">
                {note}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {!canManage ? <Badge variant="outline">Read only for billing staff</Badge> : null}
              {serializedSettings.footerMessage ? <Badge>{serializedSettings.footerMessage}</Badge> : null}
              {serializedSettings.thankYouNote ? <Badge variant="outline">{serializedSettings.thankYouNote}</Badge> : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
