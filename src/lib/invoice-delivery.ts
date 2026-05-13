import nodemailer from 'nodemailer';
import Invoice from '@/models/Invoice';
import Settings from '@/models/Settings';
import dbConnect from '@/lib/mongodb';
import { buildRestaurantInvoicePdf } from '@/lib/invoice-pdf';
import { getInvoiceFileName, normalizePdfFileName } from '@/lib/restaurant-utils';
import { serializeInvoice, serializeSettings, type SerializedInvoice, type SerializedSettings } from '@/lib/serializers';

type InvoicePdfContext = {
  invoice: SerializedInvoice;
  settings: NonNullable<SerializedSettings>;
  pdfBytes: Uint8Array;
  defaultFileName: string;
};

const DEFAULT_INVOICE_DELIVERY_EMAIL = 'prasadvavdane@gmail.com';

export function getInvoiceDeliveryRecipient() {
  return process.env.INVOICE_DELIVERY_EMAIL?.trim() || DEFAULT_INVOICE_DELIVERY_EMAIL;
}

function getGmailSmtpCredentials() {
  const user = process.env.GMAIL_SMTP_USER?.trim();
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD?.trim();

  if (!user || !pass) {
    throw new Error('Gmail SMTP is not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD.');
  }

  return { user, pass };
}

function getMailFromValue(smtpUser: string, businessName: string) {
  const configuredName = process.env.GMAIL_SMTP_FROM_NAME?.trim();
  const displayName = configuredName || businessName || 'Billing SaaS';
  return `${displayName} <${smtpUser}>`;
}

export async function buildInvoicePdfContext(invoiceId: string, tenantId: string): Promise<InvoicePdfContext | null> {
  await dbConnect();

  const [invoiceRecord, settingsRecord] = await Promise.all([
    Invoice.findOne({ _id: invoiceId, tenantId }),
    Settings.findOne({ tenantId }),
  ]);

  if (!invoiceRecord || !settingsRecord) {
    return null;
  }

  const invoice = serializeInvoice(invoiceRecord);
  const settings = serializeSettings(settingsRecord);

  if (!settings) {
    return null;
  }

  const pdfBytes = await buildRestaurantInvoicePdf(
    {
      ...invoice,
      createdAt: invoice.createdAt ?? new Date(),
    },
    {
      businessName: settings.businessName || 'Restaurant POS',
      address: settings.address || '',
      GSTIN: settings.GSTIN || '',
      phone: settings.phone || '',
      registrationNumber: settings.registrationNumber || '',
      registrationBarcodeValue: settings.registrationBarcodeValue || '',
      footerMessage: settings.footerMessage || '',
      thankYouNote: settings.thankYouNote || '',
    },
  );

  return {
    invoice,
    settings,
    pdfBytes,
    defaultFileName: getInvoiceFileName(invoice),
  };
}

export async function sendInvoicePdfEmail(input: {
  fileName: string;
  invoice: SerializedInvoice;
  settings: NonNullable<SerializedSettings>;
  pdfBytes: Uint8Array;
}) {
  const { user, pass } = getGmailSmtpCredentials();
  const recipientEmail = getInvoiceDeliveryRecipient();
  const resolvedFileName = normalizePdfFileName(input.fileName, input.fileName);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: getMailFromValue(user, input.settings.businessName),
    to: recipientEmail,
    subject: `Invoice ${input.invoice.invoiceNumber} from ${input.settings.businessName}`,
    text: [
      `Invoice Number: ${input.invoice.invoiceNumber}`,
      `Business: ${input.settings.businessName}`,
      `Customer: ${input.invoice.customerSnapshot?.customerName || 'Walk-in customer'}`,
      `Total: ${input.invoice.grandTotal}`,
      '',
      'The invoice PDF is attached with this email.',
    ].join('\n'),
    attachments: [
      {
        filename: resolvedFileName,
        content: Buffer.from(input.pdfBytes),
        contentType: 'application/pdf',
      },
    ],
  });

  return {
    recipientEmail,
    fileName: resolvedFileName,
  };
}
