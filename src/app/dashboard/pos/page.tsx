import { PageHeader } from '@/components/page-header';
import POSInterface from '@/components/pos-interface';
import { RestaurantTableGrid } from '@/components/restaurant-table-grid';
import { Kbd } from '@/components/ui/kbd';
import { getIndustryTemplateMeta } from '@/lib/demo-tenants';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { getRestaurantTables } from '@/lib/restaurant-data';
import { getWorkspaceSummary } from '@/lib/dashboard-data';
import { serializeTable } from '@/lib/serializers';
import { requireTenantUser } from '@/lib/server-auth';

export default async function POSPage() {
  const user = await requireTenantUser();

  const workspace = await getWorkspaceSummary(user);

  if (workspace.industryTemplate === 'restaurant') {
    const templateMeta = getIndustryTemplateMeta(workspace.industryTemplate);
    const tables = (await getRestaurantTables(user)).map(serializeTable);

    return (
      <div className="page-grid">
        <PageHeader
        actions={
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Kbd>Enter</Kbd>
              Open table
              <Kbd>F2</Kbd>
              Cash bill
              <Kbd>F3</Kbd>
              UPI bill
            </div>
          }
          eyebrow="Restaurant floor"
          title="Table-first POS billing"
          description=""
          // badges={[workspace.tenantCode, `${tables.length} tables`, `${occupiedCount} occupied`, `${billedCount} billed`]
        />

        <RestaurantTableGrid
          initialTables={tables}
          canManageTables={['business-admin', 'super-admin'].includes(user.role)}
        />

        <div className="rounded-[28px] border border-border bg-white/70 p-5 text-sm leading-7 text-muted-foreground">
          <p className="font-semibold text-foreground">{templateMeta.label}</p>
          <p className="mt-2">{templateMeta.summary}</p>
          <p className="mt-3">
            Tables reopen their exact draft bill automatically, and billed tables can jump straight to the original printable invoice.
          </p>
        </div>
      </div>
    );
  }

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
