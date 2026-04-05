import type { BusinessTemplate } from '@/types';
import { getIndustryTemplateMeta } from '@/lib/demo-tenants';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const templates: BusinessTemplate[] = [
  'restaurant',
  'medical-store',
  'grocery',
  'salon',
  'retail',
  'general-store',
  'service-business',
];

export default async function TemplatesPage() {
  const user = await requireTenantUser();
  const snapshot = await getTenantDashboardSnapshot(user);

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Industry templates"
        title="Template-led customization"
        description="Each tenant can carry a different operational emphasis, and the updated layout now reflects that clearly."
        badges={[snapshot.templateMeta.label, snapshot.templateMeta.emphasis]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const meta = getIndustryTemplateMeta(template);
          const isCurrent = snapshot.workspace.industryTemplate === template;

          return (
            <Card key={template} className={isCurrent ? 'border-primary/20' : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{meta.label}</CardTitle>
                  {isCurrent ? <Badge>Current</Badge> : <Badge variant="outline">Available</Badge>}
                </div>
                <CardDescription>{meta.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {meta.modules.map((module) => (
                  <div key={module} className="rounded-[20px] border border-border bg-white/68 px-4 py-3 text-sm text-muted-foreground">
                    {module}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
