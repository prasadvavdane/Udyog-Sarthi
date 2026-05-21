import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { getInventoryBootstrap } from '@/lib/inventory-service';
import { hasInventoryPermission } from '@/lib/inventory-permissions';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  if (!hasInventoryPermission(auth.user.role, 'inventory.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = await getInventoryBootstrap(auth.user);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Inventory dashboard error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load inventory dashboard' },
      { status: 500 },
    );
  }
}
