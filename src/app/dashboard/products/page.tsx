import { ProductManager } from '@/components/product-manager';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import Product from '@/models/Product';
import dbConnect from '@/lib/mongodb';
import { formatNumber } from '@/lib/format';
import { getWorkspaceSummary } from '@/lib/dashboard-data';
import { serializeProduct } from '@/lib/serializers';
import { requireTenantUser } from '@/lib/server-auth';

export default async function ProductsPage() {
  const user = await requireTenantUser();
  const canManage = ['business-admin', 'super-admin'].includes(user.role);

  await dbConnect();
  const [workspace, products] = await Promise.all([
    getWorkspaceSummary(user),
    Product.find({ tenantId: user.tenantId }).sort({ updatedAt: -1 }),
  ]);

  const serializedProducts = products.map(serializeProduct);
  const inStock = serializedProducts.filter((product) => product.stockQuantity > product.reorderLevel).length;
  const lowStock = serializedProducts.filter(
    (product) => product.stockQuantity > 0 && product.stockQuantity <= product.reorderLevel,
  ).length;
  const outOfStock = serializedProducts.filter((product) => product.stockQuantity <= 0).length;

  return (
    <div className="page-grid min-w-0 overflow-x-hidden">
      <PageHeader
        eyebrow="Menu master"
        title="Products and kitchen stock"
        description=""
        // badges={[
        //   workspace.tenantCode,
        //   `${formatNumber(serializedProducts.length)} items`,
        //   `${formatNumber(lowStock)} low stock`,
        // ]}
      />

      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        {[
          { label: 'In stock', value: inStock, note: 'Healthy inventory count' },
          { label: 'Low stock', value: lowStock, note: 'Needs reorder attention' },
          { label: 'Out of stock', value: outOfStock, note: 'Unavailable for billing' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5 md:p-6">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{formatNumber(item.value)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {canManage ? (
        <ProductManager initialProducts={serializedProducts} />
      ) : (
        <Card>
          <CardContent className="p-6 text-sm leading-7 text-muted-foreground">
            Only business admins can change menu items, pricing, GST, and stock levels. Billing staff can continue using the live POS tables.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
