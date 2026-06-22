'use client';

import { useRouter } from 'next/navigation';
import { Loader2, Mail, Printer, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { normalizePdfFileName, stripPdfExtension } from '@/lib/restaurant-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InvoiceActionsProps {
  invoiceId: string;
  fileName: string;
  canClose: boolean;
}

interface CloseTableMessages {
  success: string;
  failure: string;
}

function triggerPdfDownload(pdfBlob: Blob, resolvedFileName: string) {
  const url = URL.createObjectURL(pdfBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = resolvedFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return url;
}

export function InvoiceActions({ invoiceId, fileName, canClose }: InvoiceActionsProps) {
  const router = useRouter();
  const [pdfAction, setPdfAction] = useState<'print' | 'email' | null>(null);
  const [closing, setClosing] = useState(false);
  const [requestedFileName, setRequestedFileName] = useState(() => stripPdfExtension(fileName));

  useEffect(() => {
    setRequestedFileName(stripPdfExtension(fileName));
  }, [fileName]);

  const fetchPdfBlob = async () => {
    const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? 'Unable to generate PDF');
    }

    return response.blob();
  };

  const emailInvoicePdf = async (resolvedFileName: string) => {
    const response = await fetch(`/api/invoices/${invoiceId}/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: resolvedFileName,
      }),
    });

    const payload = (await response.json()) as { error?: string; recipientEmails?: string[] };
    if (!response.ok) {
      throw new Error(payload.error ?? 'Unable to send invoice email');
    }

    return {
      recipientEmails: payload.recipientEmails ?? [],
    };
  };

  const closeTable = async (messages?: CloseTableMessages) => {
    setClosing(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/close`, { method: 'POST' });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to close table');
      }

      toast.success(messages?.success ?? 'Table closed and marked available.');
      router.push('/dashboard/pos');
      router.refresh();
      return true;
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to close table';
      toast.error(messages ? `${messages.failure}: ${errorMessage}` : errorMessage);
      return false;
    } finally {
      setClosing(false);
    }
  };

  const printInvoice = async () => {
    setPdfAction('print');
    try {
      const pdfBlob = await fetchPdfBlob();
      const downloadUrl = triggerPdfDownload(pdfBlob, fileName);

      window.open(`/dashboard/invoices/${invoiceId}/print`, '_blank', 'noopener,noreferrer');
      if (canClose) {
        await closeTable({
          success: 'Invoice PDF generated, print view opened, and table closed.',
          failure: 'Invoice PDF generated and print view opened, but table close failed',
        });
      } else {
        toast.success('Invoice PDF generated and print view opened.');
      }
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to print invoice');
    } finally {
      setPdfAction(null);
    }
  };

  const emailPdf = async () => {
    const resolvedFileName = normalizePdfFileName(requestedFileName, fileName);

    setPdfAction('email');
    try {
      const delivery = await emailInvoicePdf(resolvedFileName);
      const recipients = delivery.recipientEmails.join(', ');
      if (canClose) {
        await closeTable({
          success: `Invoice emailed to ${recipients}, and table closed.`,
          failure: `Invoice emailed to ${recipients}, but table close failed`,
        });
      } else {
        toast.success(`Invoice emailed to ${recipients}.`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to email invoice PDF');
    } finally {
      setPdfAction(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        value={requestedFileName}
        onChange={(event) => setRequestedFileName(event.target.value)}
        disabled={pdfAction !== null || closing}
        placeholder={stripPdfExtension(fileName)}
        aria-label="PDF file name"
        className="h-10 min-w-56 flex-1"
      />
      <Button type="button" onClick={() => void printInvoice()} disabled={pdfAction !== null || closing}>
        {pdfAction === 'print' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
        Print invoice
      </Button>
      <Button type="button" variant="outline" onClick={() => void emailPdf()} disabled={pdfAction !== null || closing}>
        {pdfAction === 'email' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
        Email invoice PDF
      </Button>
      {canClose ? (
        <Button type="button" variant="outline" onClick={() => void closeTable()} disabled={closing || pdfAction !== null}>
          {closing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
          Close table
        </Button>
      ) : null}
    </div>
  );
}
