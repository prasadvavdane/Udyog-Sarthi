import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import {
  createInventoryTransaction,
  getInventoryTransactions,
  replaceInventoryTransaction,
  cancelInventoryTransaction,
} from '@/lib/inventory-service';
import { hasInventoryPermission } from '@/lib/inventory-permissions';
import {
  inventoryTransactionActionSchema,
  inventoryTransactionSchema,
} from '@/lib/inventory-validations';
import { flattenZodError } from '@/lib/validations';

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  if (!hasInventoryPermission(auth.user.role, 'inventory.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') ?? 100);
    const transactions = await getInventoryTransactions(auth.user, Number.isFinite(limit) ? limit : 100);
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Inventory transactions fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load inventory transactions' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const parsed = inventoryTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    const permission =
      parsed.data.movementType === 'manual-adjustment'
        ? 'inventory.transaction.adjust'
        : 'inventory.transaction.create';

    if (!hasInventoryPermission(auth.user.role, permission)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transaction = await createInventoryTransaction(auth.user, parsed.data);
    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Inventory transaction create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create inventory transaction' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const parsed = inventoryTransactionActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    if (parsed.data.action === 'cancel') {
      if (!hasInventoryPermission(auth.user.role, 'inventory.transaction.cancel')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const result = await cancelInventoryTransaction(auth.user, parsed.data.id, parsed.data.reason);
      return NextResponse.json(result);
    }

    if (!hasInventoryPermission(auth.user.role, 'inventory.transaction.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!parsed.data.replacement) {
      return NextResponse.json({ error: 'Replacement transaction payload is required' }, { status: 400 });
    }

    const result = await replaceInventoryTransaction(
      auth.user,
      parsed.data.id,
      parsed.data.reason,
      parsed.data.replacement,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Inventory transaction patch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update inventory transaction' },
      { status: 500 },
    );
  }
}
