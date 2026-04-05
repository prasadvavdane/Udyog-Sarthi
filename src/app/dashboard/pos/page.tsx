import POSInterface from '@/components/pos-interface';
import { PageHeader } from '@/components/page-header';
import { Kbd } from '@/components/ui/kbd';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';

export default async function POSPage() {
  const user = await requireTenantUser();
  const snapshot = await getTenantDashboardSnapshot(user);

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Counter workspace"
        title="Faster POS billing"
        description="Search, scan, apply offers, and settle payments from a layout designed to reduce clicks for cashiers."
        badges={[snapshot.workspace.tenantCode, snapshot.templateMeta.label]}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Kbd>/</Kbd>
            Search
            <Kbd>F2</Kbd>
            Cash
            <Kbd>F3</Kbd>
            UPI
            <Kbd>F4</Kbd>
            Card
          </div>
        }
      />

      <POSInterface
        initialProducts={snapshot.productCatalog}
        activeOffers={snapshot.activeOffers}
        customerList={snapshot.customerList}
        workspace={snapshot.workspace}
        templateMeta={snapshot.templateMeta}
      />
    </div>
  );
}
