import { NextResponse } from 'next/server';
import RestaurantTable from '@/models/RestaurantTable';
import dbConnect from '@/lib/mongodb';
import { requireApiUser } from '@/lib/api-auth';
import { serializeTable } from '@/lib/serializers';
import { flattenZodError, tableSchema } from '@/lib/validations';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    await dbConnect();
    const tables = await RestaurantTable.find({
      tenantId: auth.user.tenantId,
      isActive: true,
    }).sort({ tableName: 1 });

    return NextResponse.json({ tables: tables.map(serializeTable) });
  } catch (error) {
    console.error('Tables fetch error:', error);
    return NextResponse.json({ error: 'Failed to load tables' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser(['business-admin', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const parsed = tableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    await dbConnect();

    const table = await RestaurantTable.create({
      tenantId: auth.user.tenantId,
      businessId: auth.user.businessId,
      branchId: auth.user.branchId,
      createdBy: auth.user.id,
      tableName: parsed.data.tableName,
      capacity: parsed.data.capacity,
      status: parsed.data.status,
      notes: parsed.data.notes || undefined,
      isActive: parsed.data.isActive,
    });

    return NextResponse.json({ table: serializeTable(table) }, { status: 201 });
  } catch (error) {
    console.error('Table create error:', error);
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 });
  }
}
