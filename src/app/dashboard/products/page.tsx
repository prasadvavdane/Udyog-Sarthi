import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/format';
import { getTenantDashboardSnapshot } from '@/lib/dashboard-data';
import { requireTenantUser } from '@/lib/server-auth';

export default async function ProductsPage() {
  const user = await requireTenantUser();
  const snapshot = await getTenantDashboardSnapshot(user);

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Catalog and stock"
        title="Products and inventory visibility"
        description="The refreshed layout keeps price, GST, stock, and reorder context together so admins can scan faster."
        badges={[`${formatNumber(snapshot.productCatalog.length)} active products`, `${formatNumber(snapshot.inventory.lowStock)} low stock`]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'In stock', value: snapshot.inventory.inStock, note: 'Healthy inventory count' },
          { label: 'Low stock', value: snapshot.inventory.lowStock, note: 'Needs reorder attention' },
          { label: 'Out of stock', value: snapshot.inventory.outOfStock, note: 'Unavailable for billing' },
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

      <Card>
        <CardHeader>
          <CardTitle>Product master</CardTitle>
          <CardDescription>Catalog overview with the cleaner visual treatment and stock status badges.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Stock</th>
                <th className="pb-3 font-medium">Price</th>
                <th className="pb-3 font-medium">GST</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {snapshot.productCatalog.map((product) => (
                <tr key={product.id}>
                  <td className="py-4">
                    <p className="font-semibold text-foreground">{product.name}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{product.sku}</p>
                  </td>
                  <td className="py-4 text-muted-foreground">{product.category}</td>
                  <td className="py-4">
                    <p className="font-semibold text-foreground">{formatNumber(product.stockQuantity)}</p>
                    <p className="text-xs text-muted-foreground">Reorder at {formatNumber(product.reorderLevel)}</p>
                  </td>
                  <td className="py-4">
                    <p className="font-semibold text-foreground">{formatCurrency(product.sellingPrice)}</p>
                    <p className="text-xs text-muted-foreground">Buy {formatCurrency(product.buyingPrice)}</p>
                  </td>
                  <td className="py-4 text-muted-foreground">{product.gst}%</td>
                  <td className="py-4">
                    <Badge variant={product.status === 'low-stock' ? 'secondary' : product.status === 'out-of-stock' ? 'destructive' : 'outline'}>
                      {product.status.replace('-', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
