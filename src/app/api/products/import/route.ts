import { NextResponse } from 'next/server';
import Product from '@/models/Product';
import Settings from '@/models/Settings';
import dbConnect from '@/lib/mongodb';
import { requireApiUser } from '@/lib/api-auth';
import {
  ensureUniqueProductIdentity,
  getProductDuplicateMessage,
  isProductConflictError,
} from '@/lib/product-identity';
import { resolveProductIdentifiers } from '@/lib/product-identifiers';
import { serializeProduct } from '@/lib/serializers';
import { flattenZodError, productSchema } from '@/lib/validations';

type ImportRow = Record<string, unknown>;

function toStringValue(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return '';
}

function toNumberValue(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toBooleanValue(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', 'yes', '1', 'active', 'available'].includes(normalized)) {
      return true;
    }

    if (['false', 'no', '0', 'inactive', 'unavailable'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function toFoodType(value: unknown) {
  const normalized = toStringValue(value).toLowerCase();
  return normalized === 'non-veg' || normalized === 'nonveg' ? 'non-veg' : 'veg';
}

export async function POST(request: Request) {
  const auth = await requireApiUser(['business-admin', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = (await request.json()) as { rows?: ImportRow[] };
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Please upload at least one product row.' }, { status: 400 });
    }

    await dbConnect();

    const settings = await Settings.findOne({ tenantId: auth.user.tenantId })
      .select('defaultGST')
      .lean();

    const defaultGST =
      typeof settings?.defaultGST === 'number' && Number.isFinite(settings.defaultGST)
        ? settings.defaultGST
        : 18;

    const products = [];
    const errors: Array<{ rowNumber: number; productName: string; error: string }> = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const productName = toStringValue(row.productName || row.name || row.itemName);

      const parsed = productSchema.safeParse({
        productName,
        category: toStringValue(row.category) || 'General',
        price: toNumberValue(row.price, 0),
        costPrice: toNumberValue(row.costPrice, 0),
        stock: toNumberValue(row.stock, 0),
        GST: toNumberValue(row.GST, defaultGST),
        description: toStringValue(row.description),
        imageUrl: toStringValue(row.imageUrl),
        activeStatus: toBooleanValue(row.activeStatus, true),
        isAvailable: toBooleanValue(row.isAvailable, true),
        foodType: toFoodType(row.foodType),
        reorderLevel: toNumberValue(row.reorderLevel, 5),
        SKU: toStringValue(row.SKU),
        barcode: toStringValue(row.barcode),
        HSN_SAC: toStringValue(row.HSN_SAC) || '996331',
      });

      if (!parsed.success) {
        errors.push({
          rowNumber,
          productName: productName || `Row ${rowNumber}`,
          error: flattenZodError(parsed.error),
        });
        continue;
      }

      try {
        const productKey = await ensureUniqueProductIdentity({
          tenantId: auth.user.tenantId,
          businessId: auth.user.businessId,
          branchId: auth.user.branchId,
          productName: parsed.data.productName,
          category: parsed.data.category,
        });

        const identifiers = await resolveProductIdentifiers({
          tenantId: auth.user.tenantId,
          productName: parsed.data.productName,
          category: parsed.data.category,
          SKU: parsed.data.SKU,
          barcode: parsed.data.barcode,
        });

        const product = await Product.create({
          tenantId: auth.user.tenantId,
          businessId: auth.user.businessId,
          branchId: auth.user.branchId,
          createdBy: auth.user.id,
          productName: parsed.data.productName,
          productKey,
          category: parsed.data.category,
          sellingPrice: parsed.data.price,
          buyingPrice: parsed.data.costPrice,
          stockQuantity: parsed.data.stock,
          GSTPercentage: parsed.data.GST,
          description: parsed.data.description || undefined,
          imageUrl: parsed.data.imageUrl || undefined,
          activeStatus: parsed.data.activeStatus,
          isAvailable: parsed.data.isAvailable && parsed.data.stock > 0,
          foodType: parsed.data.foodType,
          reorderLevel: parsed.data.reorderLevel,
          SKU: identifiers.SKU,
          barcode: identifiers.barcode,
          HSN_SAC: parsed.data.HSN_SAC,
        });

        products.push(serializeProduct(product));
      } catch (error) {
        errors.push({
          rowNumber,
          productName: parsed.data.productName,
          error: getProductDuplicateMessage(error),
        });
      }
    }

    const importedCount = products.length;
    const failedCount = errors.length;

    return NextResponse.json(
      {
        importedCount,
        failedCount,
        products,
        errors,
      },
      { status: importedCount > 0 ? 201 : 400 },
    );
  } catch (error) {
    console.error('Product import error:', error);
    return NextResponse.json(
      { error: getProductDuplicateMessage(error) },
      { status: isProductConflictError(error) ? 400 : 500 },
    );
  }
}
