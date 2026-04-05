import Product from '@/models/Product';
import { buildProductCodePreview } from '@/lib/product-code-utils';

async function isUniqueIdentifier(
  tenantId: string,
  field: 'SKU' | 'barcode',
  value: string,
  excludeProductId?: string,
) {
  const filter: Record<string, unknown> = {
    tenantId,
    [field]: value,
  };

  if (excludeProductId) {
    filter._id = { $ne: excludeProductId };
  }

  const existing = await Product.findOne(filter).select('_id').lean();
  return !existing;
}

export async function resolveProductIdentifiers(params: {
  tenantId: string;
  productName: string;
  category: string;
  SKU?: string;
  barcode?: string;
  excludeProductId?: string;
}) {
  let SKU = params.SKU?.trim() || '';
  let barcode = params.barcode?.trim() || '';

  if (SKU) {
    const uniqueSku = await isUniqueIdentifier(params.tenantId, 'SKU', SKU, params.excludeProductId);
    if (!uniqueSku) {
      throw new Error('SKU already exists for this tenant.');
    }
  }

  if (barcode) {
    const uniqueBarcode = await isUniqueIdentifier(
      params.tenantId,
      'barcode',
      barcode,
      params.excludeProductId,
    );
    if (!uniqueBarcode) {
      throw new Error('Barcode already exists for this tenant.');
    }
  }

  let attempt = 0;
  while (!SKU || !barcode) {
    const generated = buildProductCodePreview(
      params.productName,
      params.category,
      Date.now(),
      attempt,
    );

    if (!SKU) {
      const uniqueSku = await isUniqueIdentifier(
        params.tenantId,
        'SKU',
        generated.SKU,
        params.excludeProductId,
      );

      if (uniqueSku) {
        SKU = generated.SKU;
      }
    }

    if (!barcode) {
      const uniqueBarcode = await isUniqueIdentifier(
        params.tenantId,
        'barcode',
        generated.barcode,
        params.excludeProductId,
      );

      if (uniqueBarcode) {
        barcode = generated.barcode;
      }
    }

    attempt += 1;

    if (attempt > 50) {
      throw new Error('Unable to generate a unique SKU or barcode. Please try again.');
    }
  }

  return { SKU, barcode };
}
