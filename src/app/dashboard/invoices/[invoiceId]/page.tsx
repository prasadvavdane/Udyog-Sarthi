import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { InvoiceActions } from '@/components/invoice-actions';
import { InvoiceReceipt } from '@/components/invoice-receipt';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RestaurantTable from '@/models/RestaurantTable';
import dbConnect from '@/lib/mongodb';
import { formatCurrency, formatDate, formatRelativeWindow } from '@/lib/format';
import { getInvoiceForTenant, getRestaurantSettings } from '@/lib/restaurant-data';
import { getInvoiceFileName } from '@/lib/restaurant-utils';
import { serializeInvoice, serializeSettings, serializeTable } from '@/lib/serializers';
import { requireTenantUser } from '@/lib/server-auth';

interface InvoiceDetailPageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const user = await requireTenantUser();
  const { invoiceId } = await params;

  await dbConnect();
  const [invoice, settings, table] = await Promise.all([
    getInvoiceForTenant(user, invoiceId),
    getRestaurantSettings(user),
    RestaurantTable.findOne({ tenantId: user.tenantId, lastInvoiceId: invoiceId }),
  ]);

  if (!invoice || !settings) {
    notFound();
  }

  const invoiceData = serializeInvoice(invoice);
  const settingsData = serializeSettings(settings);
  const tableData = table ? serializeTable(table) : null;

  if (!settingsData) {
    notFound();
  }

  const fileName = getInvoiceFileName(invoiceData);

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Invoice detail"
        title={invoiceData.invoiceNumber}
        description="This is the exact reconstructed restaurant bill, with the same customer, table, menu items, taxes, discount, and payment mode captured at settlement time."
        badges={[
          invoiceData.tableName || tableData?.tableName || 'Table not linked',
          invoiceData.paymentMode || 'pending',
          invoiceData.paymentStatus,
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/invoices">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to invoices
              </Link>
            </Button>
            <InvoiceActions
              invoiceId={invoiceData.id}
              fileName={fileName}
              canClose={invoiceData.invoiceStatus === 'paid'}
            />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <InvoiceReceipt invoice={invoiceData} settings={settingsData} />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice summary</CardTitle>
              <CardDescription>Operational details captured when the table was billed.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {[
                ['Invoice number', invoiceData.invoiceNumber],
                ['Table', invoiceData.tableName || tableData?.tableName || 'Unknown'],
                ['Date', formatDate(invoiceData.createdAt)],
                ['Time', formatRelativeWindow(invoiceData.createdAt)],
                ['Customer', invoiceData.customerSnapshot?.customerName || 'Walk-in customer'],
                ['Mobile', invoiceData.customerSnapshot?.mobileNumber || 'Not captured'],
                ['Guests', invoiceData.customerSnapshot?.numberOfGuests?.toString() || 'Not captured'],
                ['Payment mode', invoiceData.paymentMode || 'Pending'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[24px] border border-border bg-white/68 px-4 py-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exact billed items</CardTitle>
              <CardDescription>The original line items, quantities, rates, GST, and totals.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Item</th>
                    <th className="pb-3 font-medium">Qty</th>
                    <th className="pb-3 font-medium">Rate</th>
                    <th className="pb-3 font-medium">GST</th>
                    <th className="pb-3 font-medium text-right">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {invoiceData.items.map((item) => (
                    <tr key={`${invoiceData.id}-${item.productId}`}>
                      <td className="py-4">
                        <p className="font-semibold text-foreground">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.category || 'Menu item'}</p>
                      </td>
                      <td className="py-4 text-muted-foreground">{item.quantity}</td>
                      <td className="py-4 text-muted-foreground">{formatCurrency(item.price)}</td>
                      <td className="py-4 text-muted-foreground">{item.GSTPercentage}%</td>
                      <td className="py-4 text-right font-semibold text-foreground">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Sub total', formatCurrency(invoiceData.subtotal)],
                  ['Tax', formatCurrency(invoiceData.GSTAmount)],
                  ['Discount', formatCurrency(invoiceData.discount)],
                  ['Grand total', formatCurrency(invoiceData.grandTotal)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>GST breakup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['CGST', formatCurrency(invoiceData.GSTBreakup.CGST)],
                  ['SGST', formatCurrency(invoiceData.GSTBreakup.SGST)],
                  ['IGST', formatCurrency(invoiceData.GSTBreakup.IGST)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
