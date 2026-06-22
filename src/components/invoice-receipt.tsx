import { formatIndianBillDateTime, formatReceiptCurrency } from "@/lib/format";

type ReceiptInvoice = {
  _id: string;
  invoiceNumber: string;
  invoiceDraftId: string;
  tableName: string;
  sessionId: string;
  createdAt: string | Date;
  billedAt?: string | Date;
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
  const itemGridClass = compact
    ? "grid-cols-[minmax(0,1fr)_34px_60px_74px] gap-x-2"
    : "grid-cols-[minmax(0,1fr)_40px_68px_82px] gap-x-3";
  const totalQuantity = invoice.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const customerName =
    invoice.customerSnapshot?.customerName?.trim() || "Walk-in customer";
  const thankYouNote = settings.thankYouNote || "Thank you. Visit again.";
  const billGeneratedAt = invoice.billedAt ?? invoice.createdAt;
  const metaFields = [
    { label: "Bill generated", value: formatIndianBillDateTime(billGeneratedAt) },
    { label: "Table", value: invoice.tableName || "Counter" },
    { label: "Bill No", value: invoice.invoiceNumber },
    {
      label: "Payment",
      value: (invoice.paymentMode || "pending").toUpperCase(),
    },
    { label: "Token No", value: getTokenNumber(invoice.sessionId) },
    ...(invoice.customerSnapshot?.mobileNumber
      ? [
          {
            label: "Mobile",
            value: invoice.customerSnapshot.mobileNumber,
          },
        ]
      : []),
    ...(invoice.customerSnapshot?.numberOfGuests
      ? [
          {
            label: "Guests",
            value: String(invoice.customerSnapshot.numberOfGuests),
          },
        ]
      : []),
  ];

  return (
    <div
      className={[
        "mx-auto w-full bg-white text-[#171717] tabular-nums",
        compact
          ? "max-w-[330px] border border-stone-300 px-[14px] py-4 text-[11px] leading-[1.45] shadow-none"
          : "max-w-[390px] rounded-[30px] border border-stone-300 px-5 py-5 text-[12px] leading-[1.5] shadow-[0_18px_45px_rgba(32,25,18,0.12)]",
      ].join(" ")}
    >
      <div className="border-b border-stone-300 pb-4 text-center">
        <p className="break-words text-[17px] font-semibold uppercase tracking-[0.18em]">
          {settings.businessName}
        </p>
        {settings.address ? (
          <p className="mt-2 whitespace-pre-line leading-5 text-stone-700">
            {settings.address}
          </p>
        ) : null}
        {settings.phone ? (
          <p className="mt-1 text-stone-700">Tel No: {settings.phone}</p>
        ) : null}
        {settings.GSTIN ? (
          <p className="mt-1 text-stone-700">GSTIN: {settings.GSTIN}</p>
        ) : null}
        {settings.registrationNumber ? (
          <p className="mt-1 text-stone-700">
            Lic No: {settings.registrationNumber}
          </p>
        ) : null}
      </div>

      <div className="space-y-4 py-4">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Customer
          </p>
          <p className="break-words text-[13px] font-semibold leading-5 text-[#111111]">
            {customerName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-stone-200 pt-4">
          {metaFields.map((field) => (
            <div key={field.label} className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">
                {field.label}
              </p>
              <p className="mt-1 break-words font-medium text-[#111111]">
                {field.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-stone-300 pt-4">
        <div
          className={[
            "grid items-center border-b border-stone-300 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500",
            itemGridClass,
          ].join(" ")}
        >
          <span>Item</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Price</span>
          <span className="text-right">Amount</span>
        </div>

        <div className="divide-y divide-stone-200">
          {invoice.items.map((item) => (
            <div
              key={`${invoice._id}-${item.productId}`}
              className={[
                "grid min-w-0 items-start py-3",
                itemGridClass,
              ].join(" ")}
            >
              <div className="min-w-0 pr-1">
                <p className="break-words font-semibold leading-[1.35] text-[#111111]">
                  {item.productName}
                </p>
              </div>
              <span className="text-right font-medium text-[#111111]">
                {item.quantity}
              </span>
              <span className="text-right text-stone-700">
                {formatLineAmount(item.price)}
              </span>
              <span className="text-right font-medium text-[#111111]">
                {formatLineAmount(item.total)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-stone-300 pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-stone-600">Total Qty</span>
          <span className="font-medium text-[#111111]">{totalQuantity}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-stone-600">Sub Total</span>
          <span className="font-medium text-[#111111]">
            {formatLineAmount(invoice.subtotal)}
          </span>
        </div>
        {invoice.discount > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-600">Discount</span>
            <span className="font-medium text-[#111111]">
              -{formatLineAmount(invoice.discount)}
            </span>
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between border-t border-stone-300 pt-3 text-[16px] font-semibold">
          <span>Grand Total</span>
          <span>{formatReceiptCurrency(invoice.grandTotal)}</span>
        </div>
      </div>

      {invoice.customerSnapshot?.specialNotes ? (
        <div className="mt-4 border-t border-stone-300 pt-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Notes
          </p>
          <p className="mt-2 break-words leading-5 text-stone-700">
            Notes: {invoice.customerSnapshot.specialNotes}
          </p>
        </div>
      ) : null}

      <div className="mt-4 border-t border-stone-300 pt-4 text-center text-stone-700">
        <p>{thankYouNote}</p>
        {settings.footerMessage ? (
          <p className="mt-2 break-words leading-5">{settings.footerMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
