import Product from '@/models/Product';
import { buildProductKey } from '@/lib/product-key';

export async function ensureUniqueProductIdentity(params: {
  tenantId: string;
  businessId: string;
  branchId: string;
  productName: string;
  category: string;
  excludeProductId?: string;
}) {
  const productKey = buildProductKey(params.productName, params.category);

  const candidates = await Product.find({
    tenantId: params.tenantId,
    businessId: params.businessId,
    branchId: params.branchId,
    $or: [{ productKey }, { productKey: { $exists: false } }],
  })
    .select('_id productName category productKey')
    .lean();

  const conflict = candidates.find((candidate) => {
    const candidateId =
      typeof candidate?._id === 'string'
        ? candidate._id
        : candidate?._id && typeof candidate._id === 'object' && 'toString' in candidate._id
          ? candidate._id.toString()
          : '';

    if (params.excludeProductId && candidateId === params.excludeProductId) {
      return false;
    }

    return buildProductKey(
      typeof candidate?.productName === 'string' ? candidate.productName : '',
      typeof candidate?.category === 'string' ? candidate.category : '',
    ) === productKey;
  });

  if (conflict) {
    throw new Error('A product with the same name and category already exists for this branch.');
  }

  return productKey;
}

export function getProductDuplicateMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  ) {
    return 'A product with the same name and category already exists for this branch.';
  }

  return error instanceof Error ? error.message : 'Unable to save product.';
}

export function isProductConflictError(error: unknown) {
  const message = getProductDuplicateMessage(error);

  return message === 'A product with the same name and category already exists for this branch.';
}
