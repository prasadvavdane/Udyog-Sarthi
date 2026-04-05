function normalizeKeyPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function buildProductKey(productName: string, category: string) {
  const normalizedName = normalizeKeyPart(productName) || 'product';
  const normalizedCategory = normalizeKeyPart(category) || 'general';

  return `${normalizedName}__${normalizedCategory}`;
}
