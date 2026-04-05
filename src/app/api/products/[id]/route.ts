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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(['business-admin', 'super-admin']);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }

    await dbConnect();
    const existingProduct = await Product.findOne({ _id: id, tenantId: auth.user.tenantId });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const productKey = await ensureUniqueProductIdentity({
      tenantId: auth.user.tenantId,
      businessId: auth.user.businessId,
      branchId: auth.user.branchId,
      productName: parsed.data.productName,
      category: parsed.data.category,
      excludeProductId: id,
    });

    const identifiers = await resolveProductIdentifiers({
      tenantId: auth.user.tenantId,
      productName: parsed.data.productName,
      category: parsed.data.category,
      SKU: parsed.data.SKU || existingProduct.SKU,
      barcode: parsed.data.barcode || existingProduct.barcode,
      excludeProductId: id,
    });

    const product = await Product.findOneAndUpdate(
      { _id: id, tenantId: auth.user.tenantId },
      {
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
      },
      { new: true },
    );

    return NextResponse.json({ product: serializeProduct(product) });
  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json(
      { error: getProductDuplicateMessage(error) },
      { status: isProductConflictError(error) ? 400 : 500 },
    );
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

    const product = await Product.findOneAndDelete({ _id: id, tenantId: auth.user.tenantId });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product delete error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
