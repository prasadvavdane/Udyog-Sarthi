import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/Customer';
import Inventory from '@/models/Inventory';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import Product from '@/models/Product';

type InvoiceRequestItem = {
  productId: string;
  quantity: number;
};

type GstLine = {
  total: number;
  GSTPercentage: number;
};

function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

function calculateGSTBreakup(items: GstLine[], sameState = true) {
  let CGST = 0;
  let SGST = 0;
  let IGST = 0;

  items.forEach((item) => {
    const gstAmount = (item.total * item.GSTPercentage) / 100;
    if (sameState) {
      CGST += gstAmount / 2;
      SGST += gstAmount / 2;
    } else {
      IGST += gstAmount;
    }
  });

  return { CGST, SGST, IGST };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = (await request.json()) as {
      items: InvoiceRequestItem[];
      customerMobile?: string;
      discount?: number;
      paymentMode?: 'cash' | 'upi' | 'card';
      paymentAmount?: number;
    };

    if (!body.items?.length) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }

    let subtotal = 0;
    let gstAmount = 0;

    const invoiceItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      GSTPercentage: number;
      GSTAmount: number;
      total: number;
    }> = [];

    const stockUpdates: Array<{ productId: string; quantity: number }> = [];

    for (const item of body.items) {
      const product = await Product.findOne({
        _id: item.productId,
        tenantId: session.user.tenantId,
        activeStatus: true,
      });

      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 });
      }

      const quantity = Number(item.quantity);
      if (quantity <= 0) {
        return NextResponse.json({ error: 'Quantity must be greater than zero' }, { status: 400 });
      }

      if (product.stockQuantity < quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${product.productName}` }, { status: 400 });
      }

      const price = Number(product.sellingPrice);
      const GSTPercentage = Number(product.GSTPercentage);
      const total = quantity * price;
      const GSTAmount = (total * GSTPercentage) / 100;

      subtotal += total;
      gstAmount += GSTAmount;

      invoiceItems.push({
        productId: product._id.toString(),
        productName: product.productName,
        quantity,
        price,
        GSTPercentage,
        GSTAmount,
        total,
      });

      stockUpdates.push({ productId: product._id.toString(), quantity });
    }

    const discount = Number(body.discount ?? 0);
    const grandTotal = subtotal + gstAmount - discount;

    let customerId: string | undefined;
    if (body.customerMobile) {
      let customer = await Customer.findOne({
        tenantId: session.user.tenantId,
        mobile: body.customerMobile,
      });

      if (!customer) {
        customer = await Customer.create({
          tenantId: session.user.tenantId,
          businessId: session.user.businessId,
          branchId: session.user.branchId,
          createdBy: session.user.id,
          name: 'Walk-in Customer',
          mobile: body.customerMobile,
        });
      }

      customerId = customer._id.toString();

      const pointsEarned = Math.floor(grandTotal * 0.01);
      await Customer.findByIdAndUpdate(customer._id, {
        $inc: {
          totalSpend: grandTotal,
          loyaltyPoints: pointsEarned,
        },
        lastVisitDate: new Date(),
      });
    }

    const invoice = await Invoice.create({
      tenantId: session.user.tenantId,
      businessId: session.user.businessId,
      branchId: session.user.branchId,
      createdBy: session.user.id,
      invoiceNumber: generateInvoiceNumber(),
      customerId,
      items: invoiceItems,
      subtotal,
      discount,
      GSTAmount: gstAmount,
      grandTotal,
      paymentStatus: (body.paymentAmount ?? grandTotal) >= grandTotal ? 'paid' : 'pending',
      paymentMode: body.paymentMode ?? 'cash',
      GSTBreakup: calculateGSTBreakup(invoiceItems),
    });

    await Promise.all(
      stockUpdates.map(async ({ productId, quantity }) => {
        await Product.findByIdAndUpdate(productId, { $inc: { stockQuantity: -quantity } });
      }),
    );

    await Inventory.insertMany(
      stockUpdates.map(({ productId, quantity }) => ({
        tenantId: session.user.tenantId,
        businessId: session.user.businessId,
        branchId: session.user.branchId,
        createdBy: session.user.id,
        productId,
        quantity: -quantity,
        type: 'out',
        reason: 'Sale',
        reference: invoice._id.toString(),
      })),
    );

    await Payment.create({
      tenantId: session.user.tenantId,
      businessId: session.user.businessId,
      branchId: session.user.branchId,
      createdBy: session.user.id,
      invoiceId: invoice._id.toString(),
      amount: body.paymentAmount ?? grandTotal,
      paymentMode: body.paymentMode ?? 'cash',
      status: (body.paymentAmount ?? grandTotal) > 0 ? 'completed' : 'pending',
      transactionId: body.paymentMode === 'upi' ? `UPI-${Date.now()}` : undefined,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const invoices = await Invoice.find({ tenantId: session.user.tenantId })
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Invoices fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
