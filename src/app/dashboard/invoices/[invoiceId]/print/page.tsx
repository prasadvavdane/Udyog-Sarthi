import { notFound } from 'next/navigation';
import { AutoPrint } from '@/components/auto-print';
import { InvoiceReceipt } from '@/components/invoice-receipt';
import { getInvoiceForTenant, getRestaurantSettings } from '@/lib/restaurant-data';
import { serializeInvoice, serializeSettings } from '@/lib/serializers';
import { requireTenantUser } from '@/lib/server-auth';

interface InvoicePrintPageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function InvoicePrintPage({ params }: InvoicePrintPageProps) {
  const user = await requireTenantUser();
  const { invoiceId } = await params;

  const [invoice, settings] = await Promise.all([
    getInvoiceForTenant(user, invoiceId),
    getRestaurantSettings(user),
  ]);

  if (!invoice || !settings) {
    notFound();
  }

  const settingsData = serializeSettings(settings);
  if (!settingsData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#f6f2ea] px-4 py-10">
      <AutoPrint />
      <div className="mx-auto flex max-w-3xl justify-center">
        <InvoiceReceipt invoice={serializeInvoice(invoice)} settings={settingsData} mode="print" />
      </div>
    </div>
  );
}
