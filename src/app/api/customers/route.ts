import { NextResponse } from 'next/server';
import Customer from '@/models/Customer';
import dbConnect from '@/lib/mongodb';
import { requireApiUser } from '@/lib/api-auth';
import { serializeCustomer } from '@/lib/serializers';
import { customerEntrySchema, flattenZodError } from '@/lib/validations';

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    await dbConnect();
    const filter: Record<string, unknown> = { tenantId: auth.user.tenantId };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { mobile: { $regex: query, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(filter).sort({ updatedAt: -1 }).limit(50);
    return NextResponse.json({ customers: customers.map(serializeCustomer) });
  } catch (error) {
    console.error('Customers fetch error:', error);
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser(['business-admin', 'billing-staff', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const parsed = customerEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    await dbConnect();
    const customer = await Customer.findOneAndUpdate(
      {
        tenantId: auth.user.tenantId,
        mobile: parsed.data.mobileNumber,
      },
      {
        tenantId: auth.user.tenantId,
        businessId: auth.user.businessId,
        branchId: auth.user.branchId,
        createdBy: auth.user.id,
        name: parsed.data.customerName,
        mobile: parsed.data.mobileNumber,
        email: parsed.data.email || undefined,
        numberOfGuests: parsed.data.numberOfGuests,
        specialNotes: parsed.data.specialNotes || undefined,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );

    return NextResponse.json({ customer: serializeCustomer(customer) }, { status: 201 });
  } catch (error) {
    console.error('Customer create error:', error);
    return NextResponse.json({ error: 'Failed to save customer' }, { status: 500 });
  }
}
