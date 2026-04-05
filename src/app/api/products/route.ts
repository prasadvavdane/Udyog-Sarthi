import { NextResponse } from 'next/server';
import Product from '@/models/Product';
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

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  try {
    await dbConnect();
    const products = await Product.find({ tenantId: auth.user.tenantId }).sort({ createdAt: -1 });
    return NextResponse.json({ products: products.map(serializeProduct) });
  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser(['business-admin', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    await dbConnect();
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

    return NextResponse.json({ product: serializeProduct(product) }, { status: 201 });
  } catch (error) {
    console.error('Product create error:', error);
    return NextResponse.json(
      { error: getProductDuplicateMessage(error) },
      { status: isProductConflictError(error) ? 400 : 500 },
    );
  }
}
