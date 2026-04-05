function cleanSegment(value: string, fallback: string, length: number) {
  const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (sanitized || fallback).slice(0, length);
}

export function buildProductCodePreview(
  productName: string,
  category: string,
  seed = Date.now(),
  attempt = 0,
) {
  const hasContext = productName.trim() || category.trim();

  if (!hasContext) {
    return {
      SKU: '',
      barcode: '',
    };
  }

  const categoryPart = cleanSegment(category, 'GEN', 3);
  const productPart = cleanSegment(productName, 'ITEM', 4);
  const numericSeed = String(seed + attempt).replace(/\D/g, '').padStart(10, '0');
  const skuSuffix = numericSeed.slice(-5);
  const barcode = `29${numericSeed.slice(-9)}${String(attempt % 100).padStart(2, '0')}`;

  return {
    SKU: `${categoryPart}-${productPart}-${skuSuffix}`,
    barcode,
  };
}
