/* eslint-disable @next/next/no-img-element */
import { formatCurrency, formatRelativeWindow } from '@/lib/format';

type ReceiptInvoice = {
  _id: string;
  invoiceNumber: string;
  invoiceDraftId: string;
  tableName: string;
  sessionId: string;
  createdAt: string | Date;
  customerSnapshot?: {
    customerName: string;
    mobileNumber: string;
    email?: string;
    numberOfGuests?: number;
    specialNotes?: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    GSTPercentage: number;
    GSTAmount: number;
    total: number;
  }>;
  subtotal: number;
  GSTAmount: number;
  discount: number;
  grandTotal: number;
  paymentMode?: string;
};

type ReceiptSettings = {
  businessName: string;
  address: string;
  GSTIN: string;
  phone: string;
  logo?: string;
  footerMessage?: string;
  thankYouNote?: string;
};

interface InvoiceReceiptProps {
  invoice: ReceiptInvoice;
  settings: ReceiptSettings;
  mode?: 'screen' | 'print';
}

export function InvoiceReceipt({ invoice, settings, mode = 'screen' }: InvoiceReceiptProps) {
  const compact = mode === 'print';

  return (
    <div
      className={[
        'mx-auto w-full rounded-[26px] border border-stone-300 bg-[#fffef9] font-mono text-[#111111] shadow-[0_20px_50px_rgba(32,25,18,0.12)]',
        compact ? 'max-w-[360px] p-5 shadow-none' : 'max-w-[420px] p-6',
      ].join(' ')}
    >
      <div className="space-y-4 text-center">
        {settings.logo ? (
          <div className="flex justify-center">
            <img src={settings.logo} alt={settings.businessName} className="max-h-14 w-auto object-contain" />
          </div>
        ) : null}
        <div>
          <p className="text-2xl font-bold uppercase tracking-[0.22em]">{settings.businessName}</p>
          <p className="mt-2 whitespace-pre-line text-[12px] leading-5 text-stone-600">{settings.address}</p>
          <p className="mt-2 text-[12px] text-stone-600">GSTIN: {settings.GSTIN}</p>
          <p className="text-[12px] text-stone-600">Tel: {settings.phone}</p>
        </div>
      </div>

      <div className="my-5 border-t border-dashed border-stone-300" />

      <div className="grid grid-cols-2 gap-3 text-[12px] leading-5">
        <div>
          <p className="text-stone-500">Invoice</p>
          <p className="font-semibold">{invoice.invoiceNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-stone-500">Date & time</p>
          <p className="font-semibold">{formatRelativeWindow(invoice.createdAt)}</p>
        </div>
        <div>
          <p className="text-stone-500">Table</p>
          <p className="font-semibold">{invoice.tableName}</p>
        </div>
        <div className="text-right">
          <p className="text-stone-500">Session</p>
          <p className="font-semibold">{invoice.sessionId.slice(-8)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-white/70 p-3 text-[12px] leading-5">
        <p className="text-stone-500">Customer</p>
        <p className="font-semibold">{invoice.customerSnapshot?.customerName || 'Walk-in customer'}</p>
        <p className="text-stone-600">{invoice.customerSnapshot?.mobileNumber || 'No mobile captured'}</p>
        {invoice.customerSnapshot?.numberOfGuests ? <p className="text-stone-600">Guests: {invoice.customerSnapshot.numberOfGuests}</p> : null}
        {invoice.customerSnapshot?.specialNotes ? <p className="text-stone-600">Notes: {invoice.customerSnapshot.specialNotes}</p> : null}
      </div>

      <div className="my-5 border-t border-dashed border-stone-300" />

      <div className="space-y-3 text-[12px]">
        <div className="grid grid-cols-[1.7fr_0.6fr_0.8fr_0.6fr_0.9fr] gap-2 font-semibold uppercase tracking-[0.12em] text-stone-500">
          <span>Item</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Rate</span>
          <span className="text-right">GST</span>
          <span className="text-right">Total</span>
        </div>
        {invoice.items.map((item) => (
          <div key={`${invoice._id}-${item.productId}`} className="grid grid-cols-[1.7fr_0.6fr_0.8fr_0.6fr_0.9fr] gap-2 leading-5">
            <span className="break-words">{item.productName}</span>
            <span className="text-right">{item.quantity}</span>
            <span className="text-right">{item.price.toFixed(2)}</span>
            <span className="text-right">{item.GSTPercentage}%</span>
            <span className="text-right">{item.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="my-5 border-t border-dashed border-stone-300" />

      <div className="space-y-2 text-[12px]">
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Sub total</span>
          <span>{formatCurrency(invoice.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Tax</span>
          <span>{formatCurrency(invoice.GSTAmount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Discount</span>
          <span>{formatCurrency(invoice.discount)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-dashed border-stone-300 pt-3 text-xl font-bold">
          <span>Total</span>
          <span>{formatCurrency(invoice.grandTotal)}</span>
        </div>
        <div className="flex items-center justify-between pt-1 text-[12px] text-stone-600">
          <span>Payment mode</span>
          <span className="font-semibold uppercase">{invoice.paymentMode || 'pending'}</span>
        </div>
      </div>

      <div className="my-5 border-t border-dashed border-stone-300" />

      <div className="space-y-2 text-center text-[12px] text-stone-600">
        <p>{settings.thankYouNote || 'Thank you for dining with us.'}</p>
        <p>{settings.footerMessage || 'Powered by VyaparFlow Restaurant POS'}</p>
        <div className="mx-auto mt-3 flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-stone-300 text-[10px] uppercase tracking-[0.18em] text-stone-400">
          QR
        </div>
      </div>
    </div>
  );
}
