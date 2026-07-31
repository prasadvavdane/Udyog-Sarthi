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

const DEFAULT_INVOICE_RECIPIENT = 'prasadvavdane45@gmail.com';
const DEFAULT_GMAIL_SMTP_HOST = 'smtp.gmail.com';
const DEFAULT_GMAIL_SMTP_PORT = 465;
const SMTP_CONNECTION_TIMEOUT_MS = 8000;
const SMTP_GREETING_TIMEOUT_MS = 8000;
const SMTP_SOCKET_TIMEOUT_MS = 20000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string | undefined) {
  return value?.trim() || '';
}

function splitRecipientEmails(value: string | undefined) {
  return normalizeEmail(value)
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

export function getInvoiceDeliveryRecipients(settings: NonNullable<SerializedSettings>) {
  const configuredRecipients = splitRecipientEmails(process.env.INVOICE_DELIVERY_EMAIL);
  const recipientEmails = Array.from(
    new Set([
      ...(configuredRecipients.length > 0 ? configuredRecipients : [DEFAULT_INVOICE_RECIPIENT]),
      ...splitRecipientEmails(settings.invoiceEmailRecipients),
    ]),
  );

  const invalidEmail = recipientEmails.find((email) => !EMAIL_PATTERN.test(email));
  if (invalidEmail) {
    throw new Error(`Invoice recipient email is invalid: ${invalidEmail}`);
  }

  return recipientEmails;
}

function getGmailSmtpCredentials() {
  const user = process.env.GMAIL_SMTP_USER?.trim();
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD?.trim();

  if (!user || !pass || user === 'yourgmail@gmail.com' || pass === 'your-16-char-app-password') {
    throw new Error('Gmail SMTP is not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD.');
  }

  return { user, pass };
}

function getGmailSmtpTransport(user: string, pass: string) {
  const host = process.env.GMAIL_SMTP_HOST?.trim() || DEFAULT_GMAIL_SMTP_HOST;
  const configuredPort = process.env.GMAIL_SMTP_PORT?.trim();
  const port = configuredPort ? Number(configuredPort) : DEFAULT_GMAIL_SMTP_PORT;

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('Gmail SMTP port is invalid. Set GMAIL_SMTP_PORT to 587 or 465.');
  }

  const configuredSecure = process.env.GMAIL_SMTP_SECURE?.trim().toLowerCase();
  const secure = configuredSecure
    ? configuredSecure === 'true'
    : port === 465;

  return {
    host,
    port,
    secure,
    requireTLS: !secure,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    auth: {
      user,
      pass,
    },
  };
}

function getMailFromValue(smtpUser: string, businessName: string) {
  const configuredName = process.env.GMAIL_SMTP_FROM_NAME?.trim();
  const displayName = configuredName || businessName || 'Billing SaaS';
  return `${displayName} <${smtpUser}>`;
}

function getInvoiceEmailErrorMessage(error: unknown, host: string, port: number) {
  const message = error instanceof Error ? error.message : 'Failed to send invoice email';

  if (/Connection timeout|ETIMEDOUT|ECONNREFUSED|ENETUNREACH|ESOCKET/i.test(message)) {
    return `Unable to connect to Gmail SMTP at ${host}:${port}. Check network/firewall access or set GMAIL_SMTP_PORT to 465 with GMAIL_SMTP_SECURE=true, or 587 with GMAIL_SMTP_SECURE=false.`;
  }

  if (/EAUTH|Invalid login|Username and Password not accepted/i.test(message)) {
    return 'Gmail rejected the SMTP login. Check GMAIL_SMTP_USER and the Gmail app password.';
  }

  return message;
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
      createdAt: invoice.billedAt ?? invoice.createdAt ?? new Date(),
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
  const recipientEmails = getInvoiceDeliveryRecipients(input.settings);
  const resolvedFileName = normalizePdfFileName(input.fileName, input.fileName);
  const transport = getGmailSmtpTransport(user, pass);

  try {
    const transporter = nodemailer.createTransport(transport);

    await transporter.sendMail({
      from: getMailFromValue(user, input.settings.businessName),
      to: recipientEmails,
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
  } catch (error) {
    throw new Error(getInvoiceEmailErrorMessage(error, transport.host, transport.port));
  }

  return {
    recipientEmails,
    fileName: resolvedFileName,
  };
}
