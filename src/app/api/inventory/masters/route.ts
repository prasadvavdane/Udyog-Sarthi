import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import {
  createInventoryMaster,
  deleteInventoryMaster,
  getInventoryMasters,
  updateInventoryMaster,
} from '@/lib/inventory-service';
import { hasInventoryPermission } from '@/lib/inventory-permissions';
import {
  inventoryCategorySchema,
  inventoryItemSchema,
  inventoryLocationSchema,
  inventoryMasterResourceSchema,
  inventorySupplierSchema,
  inventoryUnitSchema,
} from '@/lib/inventory-validations';
import { flattenZodError } from '@/lib/validations';

function schemaForResource(resource: 'category' | 'unit' | 'supplier' | 'location' | 'item') {
  if (resource === 'category') {
    return inventoryCategorySchema;
  }

  if (resource === 'unit') {
    return inventoryUnitSchema;
  }

  if (resource === 'supplier') {
    return inventorySupplierSchema;
  }

  if (resource === 'location') {
    return inventoryLocationSchema;
  }

  return inventoryItemSchema;
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  if (!hasInventoryPermission(auth.user.role, 'inventory.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const masters = await getInventoryMasters(auth.user);
    return NextResponse.json(masters);
  } catch (error) {
    console.error('Inventory masters fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load inventory masters' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  if (!hasInventoryPermission(auth.user.role, 'inventory.master.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { resource?: string; data?: unknown };
    const resourceParsed = inventoryMasterResourceSchema.safeParse(body.resource);
    if (!resourceParsed.success) {
      return NextResponse.json({ error: flattenZodError(resourceParsed.error) }, { status: 400 });
    }

    const parsed = schemaForResource(resourceParsed.data).safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    const created = await createInventoryMaster(auth.user, resourceParsed.data, parsed.data);
    return NextResponse.json({ record: created });
  } catch (error) {
    console.error('Inventory master create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create inventory master' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  if (!hasInventoryPermission(auth.user.role, 'inventory.master.edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { resource?: string; id?: string; data?: unknown };
    const resourceParsed = inventoryMasterResourceSchema.safeParse(body.resource);
    if (!resourceParsed.success) {
      return NextResponse.json({ error: flattenZodError(resourceParsed.error) }, { status: 400 });
    }

    if (!body.id) {
      return NextResponse.json({ error: 'Master id is required' }, { status: 400 });
    }

    const parsed = schemaForResource(resourceParsed.data).safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    const updated = await updateInventoryMaster(auth.user, resourceParsed.data, body.id, parsed.data);
    return NextResponse.json({ record: updated });
  } catch (error) {
    console.error('Inventory master update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update inventory master' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  if (!hasInventoryPermission(auth.user.role, 'inventory.master.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const resourceParsed = inventoryMasterResourceSchema.safeParse(searchParams.get('resource'));
    if (!resourceParsed.success) {
      return NextResponse.json({ error: flattenZodError(resourceParsed.error) }, { status: 400 });
    }

    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Master id is required' }, { status: 400 });
    }

    const deleted = await deleteInventoryMaster(auth.user, resourceParsed.data, id);
    return NextResponse.json(deleted);
  } catch (error) {
    console.error('Inventory master delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete inventory master' },
      { status: 500 },
    );
  }
}
