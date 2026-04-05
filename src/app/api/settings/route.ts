import { NextResponse } from 'next/server';
import Settings from '@/models/Settings';
import dbConnect from '@/lib/mongodb';
import { requireApiUser } from '@/lib/api-auth';
import { serializeSettings } from '@/lib/serializers';
import { flattenZodError, settingsSchema } from '@/lib/validations';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    await dbConnect();
    const settings = await Settings.findOne({ tenantId: auth.user.tenantId });
    return NextResponse.json({ settings: serializeSettings(settings) });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiUser(['business-admin', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    await dbConnect();
    const existingSettings = await Settings.findOne({ tenantId: auth.user.tenantId });
    const settings = await Settings.findOneAndUpdate(
      { tenantId: auth.user.tenantId },
      {
        tenantId: auth.user.tenantId,
        businessId: auth.user.businessId,
        branchId: auth.user.branchId,
        createdBy: auth.user.id,
        businessName: parsed.data.businessName,
        GSTIN: parsed.data.GSTIN,
        address: parsed.data.address,
        phone: parsed.data.phone,
        email: parsed.data.email,
        logo: parsed.data.logo || undefined,
        footerMessage: parsed.data.footerMessage || undefined,
        thankYouNote: parsed.data.thankYouNote || undefined,
        invoicePrefix: parsed.data.invoicePrefix,
        defaultGST: parsed.data.defaultGST,
        GSTSlabs: [5, 12, 18, 28],
        currency: 'INR',
        loyaltyPointsPerRupee: 0.01,
        industryTemplate: existingSettings?.industryTemplate ?? 'restaurant',
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );

    return NextResponse.json({ settings: serializeSettings(settings) });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
