import { Card, CardContent } from '@/components/ui/card';
import { InventoryControlCenter } from '@/components/inventory-control-center';
import { getInventoryBootstrap } from '@/lib/inventory-service';
import { hasInventoryPermission } from '@/lib/inventory-permissions';
import { requireTenantUser } from '@/lib/server-auth';

export default async function InventoryPage() {
  const user = await requireTenantUser();
  const canViewInventory = hasInventoryPermission(user.role, 'inventory.view');

  if (!canViewInventory) {
    return (
      <div className="page-grid">
        <Card>
          <CardContent className="p-6 text-sm leading-7 text-muted-foreground">
            You do not currently have access to the inventory workspace. Ask an admin to assign inventory permissions for your role.
          </CardContent>
        </Card>
      </div>
    );
  }

  const bootstrap = await getInventoryBootstrap(user);

  return <InventoryControlCenter initialData={bootstrap as any} />;
}
