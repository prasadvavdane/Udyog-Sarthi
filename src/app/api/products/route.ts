import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const products = await Product.find({
      tenantId: session.user.tenantId,
      activeStatus: true,
    }).sort({ createdAt: -1 });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = (await request.json()) as {
      productName: string;
      SKU: string;
      barcode?: string;
      HSN_SAC: string;
      category: string;
      buyingPrice: number;
      sellingPrice: number;
      stockQuantity: number;
      reorderLevel: number;
      GSTPercentage: number;
      expiryDate?: string;
      batchNumber?: string;
    };

    const product = await Product.create({
      tenantId: session.user.tenantId,
      businessId: session.user.businessId,
      branchId: session.user.branchId,
      createdBy: session.user.id,
      productName: body.productName,
      SKU: body.SKU,
      barcode: body.barcode,
      HSN_SAC: body.HSN_SAC,
      category: body.category,
      buyingPrice: Number(body.buyingPrice),
      sellingPrice: Number(body.sellingPrice),
      stockQuantity: Number(body.stockQuantity),
      reorderLevel: Number(body.reorderLevel),
      GSTPercentage: Number(body.GSTPercentage),
      expiryDate: body.expiryDate,
      batchNumber: body.batchNumber,
      activeStatus: true,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
