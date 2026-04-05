import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { RestaurantBillingWorkspace } from '@/components/restaurant-billing-workspace';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { getWorkspaceSummary } from '@/lib/dashboard-data';
import { getRestaurantCustomers, getRestaurantProducts, getTableById, getTableDraftInvoice } from '@/lib/restaurant-data';
import { serializeCustomer, serializeInvoice, serializeProduct, serializeTable } from '@/lib/serializers';
import { requireTenantUser } from '@/lib/server-auth';

interface TableBillingPageProps {
  params: Promise<{ tableId: string }>;
}

export default async function TableBillingPage({ params }: TableBillingPageProps) {
  const user = await requireTenantUser();
  const workspace = await getWorkspaceSummary(user);

  if (workspace.industryTemplate !== 'restaurant') {
    redirect('/dashboard/pos');
  }

  const { tableId } = await params;

  const [table, draft, products, customers] = await Promise.all([
    getTableById(user, tableId),
    getTableDraftInvoice(user, tableId),
    getRestaurantProducts(user),
    getRestaurantCustomers(user),
  ]);

  if (!table) {
    notFound();
  }

  const serializedTable = serializeTable(table);
  const serializedDraft = draft ? serializeInvoice(draft) : null;
  const serializedProducts = products.map(serializeProduct);
  const serializedCustomers = customers.map(serializeCustomer);

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Table workspace"
        title={`${serializedTable.tableName} billing session`}
        description="Every change is saved against this table only, so reopening the table restores the same customer, item lines, totals, and draft bill."
        badges={[
          workspace.businessName,
          `Status ${serializedTable.status}`,
          serializedDraft?.invoiceDraftId || 'Draft pending',
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/pos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to tables
            </Link>
          </Button>
        }
      />

      <RestaurantBillingWorkspace
        table={serializedTable}
        initialDraft={serializedDraft}
        products={serializedProducts}
        customers={serializedCustomers}
      />
    </div>
  );
}
