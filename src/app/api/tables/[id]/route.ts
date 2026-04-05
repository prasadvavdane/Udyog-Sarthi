import { NextResponse } from 'next/server';
import RestaurantTable from '@/models/RestaurantTable';
import dbConnect from '@/lib/mongodb';
import { requireApiUser } from '@/lib/api-auth';
import { serializeTable } from '@/lib/serializers';
import { flattenZodError, tableSchema } from '@/lib/validations';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(['business-admin', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = tableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    await dbConnect();
    const table = await RestaurantTable.findOneAndUpdate(
      { _id: id, tenantId: auth.user.tenantId },
      {
        tableName: parsed.data.tableName,
        capacity: parsed.data.capacity,
        status: parsed.data.status,
        notes: parsed.data.notes || undefined,
        isActive: parsed.data.isActive,
      },
      { new: true },
    );

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ table: serializeTable(table) });
  } catch (error) {
    console.error('Table update error:', error);
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(['business-admin', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    await dbConnect();

    const table = await RestaurantTable.findOneAndUpdate(
      { _id: id, tenantId: auth.user.tenantId },
      { isActive: false },
      { new: true },
    );

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Table delete error:', error);
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
  }
}
