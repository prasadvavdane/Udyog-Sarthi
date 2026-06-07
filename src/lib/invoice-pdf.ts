import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont } from "pdf-lib";
import { formatReceiptCurrency } from "@/lib/format";

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

function wrapTextToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";

  for (const character of normalized) {
    const candidate = `${current}${character}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
      continue;
    }

    const lastSpace = current.lastIndexOf(" ");
    if (lastSpace > 0) {
      lines.push(current.slice(0, lastSpace).trimEnd());
      current = `${current.slice(lastSpace + 1)}${character}`.trimStart();
      continue;
    }

    lines.push(current);
    current = character;
  }

  if (current.trim()) {
    lines.push(current.trim());
  }

  return lines.length ? lines : [""];
}

export async function buildRestaurantInvoicePdf(
  invoice: PrintableInvoice,
  settings: PrintableSettings,
) {
  const customerName =
    invoice.customerSnapshot?.customerName?.trim() || "Walk-in customer";
  const totalQuantity = invoice.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 390;
  const left = 20;
  const right = pageWidth - 20;
  const contentWidth = right - left;
  const metaColumnGap = 16;
  const metaCellWidth = (contentWidth - metaColumnGap) / 2;

  const amountWidth = 82;
  const priceWidth = 68;
  const qtyWidth = 40;
  const itemColumnGap = 12;
  const amountLeft = right - amountWidth;
  const priceLeft = amountLeft - itemColumnGap - priceWidth;
  const qtyLeft = priceLeft - itemColumnGap - qtyWidth;
  const itemNameWidth = qtyLeft - left - itemColumnGap;

  const addressLines = settings.address
    ? wrapTextToWidth(settings.address, font, 9, contentWidth - 16)
    : [];
  const customerLines = wrapTextToWidth(customerName, bold, 13, contentWidth);
  const noteLines = invoice.customerSnapshot?.specialNotes
    ? wrapTextToWidth(
        invoice.customerSnapshot.specialNotes,
        font,
        9,
        contentWidth,
      )
    : [];
  const footerLines = [
    ...wrapTextToWidth(
      settings.thankYouNote || "Thank you. Visit again.",
      font,
      9,
      contentWidth - 16,
    ),
    ...(settings.footerMessage
      ? wrapTextToWidth(settings.footerMessage, font, 9, contentWidth - 16)
      : []),
  ];

  const rawMetaFields = [
    { label: "Date", value: formatReceiptDate(invoice.createdAt) },
    { label: "Time", value: formatReceiptTime(invoice.createdAt) },
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

  const metaRows: Array<
    Array<{ label: string; valueLines: string[] }>
  > = [];
  for (let index = 0; index < rawMetaFields.length; index += 2) {
    metaRows.push(
      rawMetaFields.slice(index, index + 2).map((field) => ({
        label: field.label,
        valueLines: wrapTextToWidth(field.value, bold, 8.6, metaCellWidth),
      })),
    );
  }

  const itemLayouts = invoice.items.map((item) => ({
    ...item,
    nameLines: wrapTextToWidth(item.productName, bold, 8.7, itemNameWidth),
  }));

  const metaHeight =
    metaRows.reduce((sum, row) => {
      const valueLineCount = Math.max(
        1,
        ...row.map((field) => field.valueLines.length),
      );
      return sum + 14 + valueLineCount * 10 + 6;
    }, 0) + 8;

  const headerHeight =
    28 +
    addressLines.length * 11 +
    (settings.phone ? 11 : 0) +
    (settings.GSTIN ? 11 : 0) +
    (settings.registrationNumber ? 11 : 0) +
    18;
  const customerHeight = 14 + customerLines.length * 14 + 18;
  const itemsHeight =
    26 +
    itemLayouts.reduce((sum, item) => sum + item.nameLines.length * 12 + 12, 0);
  const summaryRowCount = 2 + (invoice.discount > 0 ? 1 : 0);
  const summaryHeight = summaryRowCount * 16 + 34;
  const notesHeight = noteLines.length ? 18 + noteLines.length * 11 : 0;
  const footerHeight = 18 + footerLines.length * 11;
  const pageHeight = Math.max(
    560,
    40 +
      headerHeight +
      customerHeight +
      metaHeight +
      itemsHeight +
      summaryHeight +
      notesHeight +
      footerHeight,
  );

  const page = pdf.addPage([pageWidth, pageHeight]);
  const textColor = rgb(0.11, 0.11, 0.11);
  const mutedColor = rgb(0.42, 0.42, 0.42);
  const lineColor = rgb(0.82, 0.82, 0.82);
  const softLineColor = rgb(0.91, 0.91, 0.91);
  const headerFill = rgb(0.965, 0.965, 0.965);
  let y = pageHeight - 26;

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    size: number,
    useBold = false,
    color = textColor,
  ) => {
    page.drawText(text, {
      x,
      y: yPos,
      size,
      font: useBold ? bold : font,
      color,
    });
  };

  const drawCenteredText = (
    text: string,
    yPos: number,
    size: number,
    useBold = false,
    color = textColor,
  ) => {
    const activeFont = useBold ? bold : font;
    const width = activeFont.widthOfTextAtSize(text, size);
    drawText(text, left + Math.max((contentWidth - width) / 2, 0), yPos, size, useBold, color);
  };

  const drawRightAlignedText = (
    text: string,
    rightEdge: number,
    yPos: number,
    size: number,
    useBold = false,
    color = textColor,
  ) => {
    const activeFont = useBold ? bold : font;
    const width = activeFont.widthOfTextAtSize(text, size);
    drawText(text, rightEdge - width, yPos, size, useBold, color);
  };

  const drawSeparator = (topGap = 2, bottomGap = 10) => {
    y -= topGap;
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 0.8,
      color: lineColor,
    });
    y -= bottomGap;
  };

  drawCenteredText(settings.businessName.toUpperCase(), y, 17, true);
  y -= 24;

  addressLines.forEach((line) => {
    drawCenteredText(line, y, 9, false, mutedColor);
    y -= 11;
  });

  if (settings.phone) {
    drawCenteredText(`Tel No: ${settings.phone}`, y, 9, false, mutedColor);
    y -= 11;
  }

  if (settings.GSTIN) {
    drawCenteredText(`GSTIN: ${settings.GSTIN}`, y, 9, false, mutedColor);
    y -= 11;
  }

  if (settings.registrationNumber) {
    drawCenteredText(
      `Lic No: ${settings.registrationNumber}`,
      y,
      9,
      false,
      mutedColor,
    );
    y -= 11;
  }

  drawSeparator(2, 14);

  drawText("CUSTOMER", left, y, 10, false, mutedColor);
  y -= 16;
  customerLines.forEach((line) => {
    drawText(line, left, y, 13, true);
    y -= 14;
  });

  drawSeparator(2, 12);

  metaRows.forEach((row) => {
    const rowTop = y;

    row.forEach((field, index) => {
      const x = index === 0 ? left : left + metaCellWidth + metaColumnGap;
      drawText(field.label.toUpperCase(), x, rowTop, 9.5, false, mutedColor);
      field.valueLines.forEach((line, lineIndex) => {
        drawText(line, x, rowTop - 12 - lineIndex * 10, 11.2, true);
      });
    });

    const rowHeight =
      14 +
      Math.max(1, ...row.map((field) => field.valueLines.length)) * 10 +
      6;
    y -= rowHeight;
  });

  drawSeparator(2, 12);

  page.drawRectangle({
    x: left,
    y: y - 14,
    width: contentWidth,
    height: 18,
    color: headerFill,
    borderColor: lineColor,
    borderWidth: 0.8,
  });
  drawText("ITEM", left + 6, y - 9, 10, true, mutedColor);
  drawRightAlignedText("QTY", qtyLeft + qtyWidth, y - 9, 10, true, mutedColor);
  drawRightAlignedText(
    "PRICE",
    priceLeft + priceWidth,
    y - 9,
    10,
    true,
    mutedColor,
  );
  drawRightAlignedText(
    "AMOUNT",
    amountLeft + amountWidth,
    y - 9,
    10,
    true,
    mutedColor,
  );
  y -= 26;

  itemLayouts.forEach((item) => {
    const rowTop = y;

    item.nameLines.forEach((line, index) => {
      drawText(line, left, rowTop - index * 12, 11.2, index === 0);
    });

    drawRightAlignedText(
      String(item.quantity),
      qtyLeft + qtyWidth,
      rowTop,
      11.2,
      true,
    );
    drawRightAlignedText(
      money(item.price),
      priceLeft + priceWidth,
      rowTop,
      11.2,
    );
    drawRightAlignedText(
      money(item.total),
      amountLeft + amountWidth,
      rowTop,
      11.2,
      true,
    );

    y -= item.nameLines.length * 12 + 5;
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 0.5,
      color: softLineColor,
    });
    y -= 7;
  });

  const summaryRows = [
    { label: "Total Qty", value: String(totalQuantity) },
    { label: "Sub Total", value: money(invoice.subtotal) },
    ...(invoice.discount > 0
      ? [{ label: "Discount", value: `- ${money(invoice.discount)}` }]
      : []),
  ];
  const summaryBoxHeight = summaryRows.length * 16 + 36;

  page.drawRectangle({
    x: left,
    y: y - summaryBoxHeight + 6,
    width: contentWidth,
    height: summaryBoxHeight,
    borderColor: lineColor,
    borderWidth: 0.8,
  });

  let summaryY = y - 14;
  summaryRows.forEach((row) => {
    drawText(row.label, left + 12, summaryY, 11, false, mutedColor);
    drawRightAlignedText(row.value, right - 12, summaryY, 11, true);
    summaryY -= 16;
  });

  page.drawLine({
    start: { x: left + 8, y: summaryY + 5 },
    end: { x: right - 8, y: summaryY + 5 },
    thickness: 0.8,
    color: lineColor,
  });
  drawText("Grand Total", left + 12, summaryY - 12, 16, true);
  drawRightAlignedText(
    formatReceiptCurrency(invoice.grandTotal),
    right - 12,
    summaryY - 12,
    16,
    true,
  );
  y -= summaryBoxHeight + 12;

  if (noteLines.length) {
    drawSeparator(0, 10);
    drawText("NOTES", left, y, 10, false, mutedColor);
    y -= 16;
    noteLines.forEach((line) => {
      drawText(line, left, y, 9, false, mutedColor);
      y -= 11;
    });
  }

  drawSeparator(2, 10);
  footerLines.forEach((line, index) => {
    drawCenteredText(line, y, 9, index === 0, mutedColor);
    y -= 11;
  });

  return pdf.save();
}
