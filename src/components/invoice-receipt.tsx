import { formatCurrency } from "@/lib/format";

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
  registrationNumber?: string;
  registrationBarcodeValue?: string;
  footerMessage?: string;
  thankYouNote?: string;
};

interface InvoiceReceiptProps {
  invoice: ReceiptInvoice;
  settings: ReceiptSettings;
  mode?: "screen" | "print";
}

function formatReceiptDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function formatReceiptTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatLineAmount(value: number) {
  return value.toFixed(2);
}

function getTokenNumber(sessionId: string) {
  return sessionId.slice(-6).toUpperCase();
}

export function InvoiceReceipt({
  invoice,
  settings,
  mode = "screen",
}: InvoiceReceiptProps) {
  const compact = mode === "print";
  const totalQuantity = invoice.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const customerName =
    invoice.customerSnapshot?.customerName?.trim() || "Walk-in customer";
  const thankYouNote = settings.thankYouNote || "Thank you. Visit again.";

  return (
    <div
      className={[
        "mx-auto w-full bg-white font-mono text-[#111111]",
        compact
          ? "max-w-[320px] p-3 text-[11px] leading-5 shadow-none"
          : "max-w-[360px] border border-stone-300 p-4 text-[12px] leading-5 shadow-[0_18px_45px_rgba(32,25,18,0.12)]",
      ].join(" ")}
    >
      <div className="text-center">
        <p className="break-words text-[15px] font-bold uppercase tracking-[0.16em]">
          {settings.businessName}
        </p>
        {settings.address ? (
          <p className="mt-1 whitespace-pre-line text-stone-700">
            {settings.address}
          </p>
        ) : null}
        {settings.phone ? (
          <p className="mt-1 text-stone-700">Tel No: {settings.phone}</p>
        ) : null}
        {settings.registrationNumber ? (
          <p className="mt-1 text-stone-700">
            Lic No: {settings.registrationNumber}
          </p>
        ) : null}
      </div>

      <div className="my-3 border-y border-stone-400 py-2">
        <div className="grid grid-cols-[auto_1fr] items-start gap-2">
          <span>Name:</span>
          <span className="break-words text-right font-semibold">
            {customerName}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <span>Date: {formatReceiptDate(invoice.createdAt)}</span>
          <span>Dine In: {invoice.tableName || "Counter"}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span>Time: {formatReceiptTime(invoice.createdAt)}</span>
          <span>Bill No: {invoice.invoiceNumber}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span>
            Payment: {(invoice.paymentMode || "pending").toUpperCase()}
          </span>
          <span>Token No: {getTokenNumber(invoice.sessionId)}</span>
        </div>
        {invoice.customerSnapshot?.mobileNumber ? (
          <p>Mobile: {invoice.customerSnapshot.mobileNumber}</p>
        ) : null}
        {invoice.customerSnapshot?.numberOfGuests ? (
          <p>Guests: {invoice.customerSnapshot.numberOfGuests}</p>
        ) : null}
      </div>

      <div className="my-3 border-y border-stone-400 py-2">
        <div className="grid grid-cols-[1.7fr_0.45fr_0.8fr_0.9fr] gap-2 font-semibold">
          <span>Item</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Price</span>
          <span className="text-right">Amount</span>
        </div>
      </div>

      <div className="space-y-2">
        {invoice.items.map((item) => (
          <div
            key={`${invoice._id}-${item.productId}`}
            className="grid grid-cols-[1.7fr_0.45fr_0.8fr_0.9fr] gap-2"
          >
            <span className="break-words">{item.productName}</span>
            <span className="text-right">{item.quantity}</span>
            <span className="text-right">{formatLineAmount(item.price)}</span>
            <span className="text-right">{formatLineAmount(item.total)}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-stone-400 pt-2">
        <div className="flex items-center justify-between gap-3">
          <span>Total Qty: {totalQuantity}</span>
          <span>Sub Total: {formatLineAmount(invoice.subtotal)}</span>
        </div>
        {invoice.discount > 0 ? (
          <div className="mt-1 flex items-center justify-between gap-3">
            <span>Discount</span>
            <span>{formatLineAmount(invoice.discount)}</span>
          </div>
        ) : null}
        <div className="mt-2 flex items-center justify-between border-t border-stone-400 pt-2 text-[15px] font-bold">
          <span>Grand Total</span>
          <span>{formatCurrency(invoice.grandTotal)}</span>
        </div>
      </div>

      {invoice.customerSnapshot?.specialNotes ? (
        <div className="mt-3 border-t border-stone-400 pt-2">
          <p className="break-words">
            Notes: {invoice.customerSnapshot.specialNotes}
          </p>
        </div>
      ) : null}

      <div className="mt-3 border-t border-stone-400 pt-2 text-center text-stone-700">
        <p>{thankYouNote}</p>
        {settings.footerMessage ? (
          <p className="mt-1 break-words">{settings.footerMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
