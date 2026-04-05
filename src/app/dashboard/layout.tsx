import type { ReactNode } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { getWorkspaceSummary } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';

export default async function DashboardRouteLayout({ children }: { children: ReactNode }) {
  const user = await requireTenantUser();
  const workspace = await getWorkspaceSummary(user);

  return (
    <DashboardLayout
      user={{ name: user.name, role: user.role }}
      workspace={{
        businessName: workspace.businessName,
        industryTemplate: workspace.industryTemplate,
        tenantCode: workspace.tenantCode,
        subscriptionPlan: workspace.subscriptionPlan,
        branchId: workspace.branchId,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
