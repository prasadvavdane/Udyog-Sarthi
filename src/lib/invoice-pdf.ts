import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type PrintableInvoice = {
  invoiceNumber: string;
  invoiceDraftId?: string;
  tableName?: string;
  sessionId?: string;
  createdAt: string | Date;
  paymentMode?: string;
  customerSnapshot?: {
    customerName?: string;
    mobileNumber?: string;
    numberOfGuests?: number;
    specialNotes?: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    GSTPercentage: number;
    total: number;
  }>;
  subtotal: number;
  GSTAmount: number;
  discount: number;
  grandTotal: number;
  GSTBreakup?: {
    CGST?: number;
    SGST?: number;
    IGST?: number;
  };
};

type PrintableSettings = {
  businessName: string;
  address: string;
  GSTIN: string;
  phone: string;
  registrationNumber?: string;
  registrationBarcodeValue?: string;
  footerMessage?: string;
  thankYouNote?: string;
};

function money(value: number) {
  return value.toFixed(2);
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

function getTokenNumber(sessionId?: string) {
  return sessionId ? sessionId.slice(-6).toUpperCase() : "NA";
}

function wrapText(text: string, size: number) {
  if (text.length <= size) {
    return [text];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= size) {
      current = next;
      return;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function buildRestaurantInvoicePdf(
  invoice: PrintableInvoice,
  settings: PrintableSettings,
) {
  const customerName =
    invoice.customerSnapshot?.customerName || "Walk-in customer";
  const totalQuantity = invoice.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const noteLines = invoice.customerSnapshot?.specialNotes
    ? wrapText(`Notes: ${invoice.customerSnapshot.specialNotes}`, 32)
    : [];
  const footerLines = [
    settings.thankYouNote || "Thank you. Visit again.",
    ...(settings.footerMessage ? wrapText(settings.footerMessage, 34) : []),
  ];

  const baseHeight = 320;
  const itemHeight = invoice.items.reduce(
    (sum, item) => sum + wrapText(item.productName, 20).length * 11 + 8,
    0,
  );
  const detailHeight =
    54 +
    (invoice.customerSnapshot?.mobileNumber ? 12 : 0) +
    (invoice.customerSnapshot?.numberOfGuests ? 12 : 0);
  const noteHeight = noteLines.length ? noteLines.length * 10 + 16 : 0;
  const footerHeight = footerLines.length * 10 + 16;
  const pageHeight = Math.max(
    baseHeight + itemHeight + detailHeight + noteHeight + footerHeight,
    500,
  );
  const pageWidth = 280;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageWidth, pageHeight]);
  const font = await pdf.embedFont(StandardFonts.Courier);
  const bold = await pdf.embedFont(StandardFonts.CourierBold);

  const left = 18;
  const right = pageWidth - 18;
  let y = pageHeight - 24;

  const drawCentered = (text: string, size: number, useBold = false) => {
    const activeFont = useBold ? bold : font;
    const width = activeFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: Math.max((pageWidth - width) / 2, 12),
      y,
      size,
      font: activeFont,
      color: rgb(0.08, 0.08, 0.08),
    });
    y -= size + 4;
  };

  const drawLeftText = (
    text: string,
    x: number,
    size: number,
    useBold = false,
    color = rgb(0.08, 0.08, 0.08),
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: useBold ? bold : font,
      color,
    });
  };

  const drawRightText = (text: string, size: number, useBold = false) => {
    const activeFont = useBold ? bold : font;
    const width = activeFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: Math.max(right - width, left + 84),
      y,
      size,
      font: activeFont,
      color: rgb(0.08, 0.08, 0.08),
    });
  };

  const drawLine = (spacing = 10) => {
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 0.8,
      color: rgb(0.52, 0.52, 0.52),
    });
    y -= spacing;
  };

  const drawPair = (label: string, value: string, useBold = false) => {
    drawLeftText(label, left, 9, false, rgb(0.38, 0.38, 0.38));
    drawRightText(value, 9, useBold);
    y -= 14;
  };

  const drawReceiptRow = (
    leftText: string,
    rightText?: string,
    useBold = false,
  ) => {
    drawLeftText(leftText, left, 8.5, useBold);

    if (rightText) {
      drawRightText(rightText, 8.5, useBold);
    }

    y -= 13;
  };

  drawCentered(settings.businessName.toUpperCase(), 14, true);
  if (settings.address) {
    wrapText(settings.address, 28).forEach((line) => drawCentered(line, 8));
  }
  if (settings.phone) {
    drawCentered(`Tel No: ${settings.phone}`, 8);
  }
  if (settings.registrationNumber) {
    drawCentered(`Lic No: ${settings.registrationNumber}`, 8);
  }

  drawLine();
  drawPair("Name:", customerName, true);
  drawLine();

  drawReceiptRow(
    `Date: ${formatReceiptDate(invoice.createdAt)}`,
    `Dine In: ${invoice.tableName || "Counter"}`,
  );
  drawReceiptRow(
    `Time: ${formatReceiptTime(invoice.createdAt)}`,
    `Bill No: ${invoice.invoiceNumber}`,
  );
  drawReceiptRow(
    `Payment: ${(invoice.paymentMode || "pending").toUpperCase()}`,
    `Token No: ${getTokenNumber(invoice.sessionId)}`,
  );
  if (invoice.customerSnapshot?.mobileNumber) {
    drawReceiptRow(`Mobile: ${invoice.customerSnapshot.mobileNumber}`);
  }
  if (invoice.customerSnapshot?.numberOfGuests) {
    drawReceiptRow(
      `Guests: ${String(invoice.customerSnapshot.numberOfGuests)}`,
    );
  }

  drawLine();

  drawLeftText("ITEM", left, 9, true);
  drawLeftText("QTY", 176, 9, true);
  drawLeftText("PRICE", 204, 9, true);
  drawRightText("AMT", 9, true);
  y -= 12;
  drawLine();

  invoice.items.forEach((item) => {
    const lines = wrapText(item.productName, 20);
    lines.forEach((line, index) => {
      drawLeftText(line, left, 8.5, index === 0);

      if (index === 0) {
        drawLeftText(String(item.quantity), 180, 8.5);
        drawLeftText(money(item.price), 202, 8.5);
        drawRightText(money(item.total), 8.5);
      }

      y -= 11;
    });
    y -= 3;
  });

  drawLine();
  drawReceiptRow(
    `Total Qty: ${totalQuantity}`,
    `Sub Total: ${money(invoice.subtotal)}`,
  );
  if (invoice.discount > 0) {
    drawReceiptRow("Discount", money(invoice.discount));
  }

  drawLine(8);
  drawLeftText("Grand Total", left, 13, true);
  drawRightText(`Rs ${money(invoice.grandTotal)}`, 13, true);
  y -= 18;

  if (noteLines.length) {
    drawLine();
    noteLines.forEach((line) => {
      drawLeftText(line, left, 8);
      y -= 10;
    });
  }

  drawLine();
  footerLines.forEach((line) => drawCentered(line, 8));

  return pdf.save();
}
