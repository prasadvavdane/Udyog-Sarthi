import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

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
  footerMessage?: string;
  thankYouNote?: string;
};

function money(value: number) {
  return value.toFixed(2);
}

function wrapText(text: string, size: number) {
  if (text.length <= size) {
    return [text];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

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

export async function buildRestaurantInvoicePdf(invoice: PrintableInvoice, settings: PrintableSettings) {
  const qrDataUrl = await QRCode.toDataURL(`invoice:${invoice.invoiceNumber}|total:${invoice.grandTotal}`, {
    margin: 0,
    width: 120,
  });

  const baseHeight = 420;
  const itemHeight = invoice.items.reduce((sum, item) => sum + wrapText(item.productName, 22).length * 12 + 18, 0);
  const noteHeight = invoice.customerSnapshot?.specialNotes ? 30 : 0;
  const pageHeight = Math.max(baseHeight + itemHeight + noteHeight, 620);
  const pageWidth = 280;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageWidth, pageHeight]);
  const font = await pdf.embedFont(StandardFonts.Courier);
  const bold = await pdf.embedFont(StandardFonts.CourierBold);
  const qrImage = await pdf.embedPng(qrDataUrl);

  const left = 20;
  const right = pageWidth - 20;
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

  const drawLine = () => {
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 1,
      color: rgb(0.78, 0.78, 0.78),
    });
    y -= 10;
  };

  const drawPair = (label: string, value: string, useBold = false) => {
    page.drawText(label, {
      x: left,
      y,
      size: 9,
      font,
      color: rgb(0.38, 0.38, 0.38),
    });

    const activeFont = useBold ? bold : font;
    const valueWidth = activeFont.widthOfTextAtSize(value, 9);
    page.drawText(value, {
      x: Math.max(right - valueWidth, left + 80),
      y,
      size: 9,
      font: activeFont,
      color: rgb(0.08, 0.08, 0.08),
    });
    y -= 14;
  };

  drawCentered(settings.businessName.toUpperCase(), 16, true);
  wrapText(settings.address, 28).forEach((line) => drawCentered(line, 9));
  drawCentered(`GSTIN: ${settings.GSTIN}`, 9);
  drawCentered(`Tel: ${settings.phone}`, 9);

  drawLine();
  drawPair('Invoice', invoice.invoiceNumber, true);
  drawPair('Date', new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(invoice.createdAt)));
  drawPair('Table', invoice.tableName || 'Counter', true);
  drawPair('Session', invoice.sessionId?.slice(-8) || 'NA');

  if (invoice.customerSnapshot?.customerName) {
    drawPair('Customer', invoice.customerSnapshot.customerName, true);
  }

  if (invoice.customerSnapshot?.mobileNumber) {
    drawPair('Mobile', invoice.customerSnapshot.mobileNumber);
  }

  if (invoice.customerSnapshot?.numberOfGuests) {
    drawPair('Guests', String(invoice.customerSnapshot.numberOfGuests));
  }

  drawLine();

  page.drawText('ITEM', { x: left, y, size: 9, font: bold });
  page.drawText('QTY', { x: 150, y, size: 9, font: bold });
  page.drawText('RATE', { x: 184, y, size: 9, font: bold });
  page.drawText('TOTAL', { x: 226, y, size: 9, font: bold });
  y -= 12;
  drawLine();

  invoice.items.forEach((item) => {
    const lines = wrapText(item.productName, 22);
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: left,
        y,
        size: 9,
        font: index === 0 ? bold : font,
      });

      if (index === 0) {
        page.drawText(String(item.quantity), { x: 154, y, size: 9, font });
        page.drawText(money(item.price), { x: 180, y, size: 9, font });
        page.drawText(money(item.total), { x: 222, y, size: 9, font });
      }

      y -= 11;
    });

    page.drawText(`GST ${item.GSTPercentage}%`, {
      x: left,
      y,
      size: 8,
      font,
      color: rgb(0.42, 0.42, 0.42),
    });
    y -= 15;
  });

  drawLine();
  drawPair('Sub total', money(invoice.subtotal), true);
  drawPair('Tax', money(invoice.GSTAmount));
  drawPair('Discount', money(invoice.discount));
  drawPair('CGST', money(invoice.GSTBreakup?.CGST ?? 0));
  drawPair('SGST', money(invoice.GSTBreakup?.SGST ?? 0));

  if ((invoice.GSTBreakup?.IGST ?? 0) > 0) {
    drawPair('IGST', money(invoice.GSTBreakup?.IGST ?? 0));
  }

  y -= 2;
  page.drawText('TOTAL', { x: left, y, size: 14, font: bold });
  const grandWidth = bold.widthOfTextAtSize(money(invoice.grandTotal), 14);
  page.drawText(money(invoice.grandTotal), {
    x: right - grandWidth,
    y,
    size: 14,
    font: bold,
  });
  y -= 20;

  drawPair('Payment', (invoice.paymentMode || 'pending').toUpperCase(), true);

  if (invoice.customerSnapshot?.specialNotes) {
    drawLine();
    wrapText(`Notes: ${invoice.customerSnapshot.specialNotes}`, 30).forEach((line) => {
      page.drawText(line, {
        x: left,
        y,
        size: 8,
        font,
        color: rgb(0.38, 0.38, 0.38),
      });
      y -= 11;
    });
  }

  drawLine();

  const qrSize = 52;
  page.drawImage(qrImage, {
    x: (pageWidth - qrSize) / 2,
    y: Math.max(y - qrSize, 80),
    width: qrSize,
    height: qrSize,
  });

  y = Math.max(y - 64, 52);
  drawCentered(settings.thankYouNote || 'Thank you for dining with us.', 9);
  drawCentered(settings.footerMessage || 'Generated by the restaurant POS workspace', 8);

  return pdf.save();
}
