'use client';

import { useRouter } from 'next/navigation';
import { Download, Loader2, Printer, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface InvoiceActionsProps {
  invoiceId: string;
  fileName: string;
  canClose: boolean;
}

export function InvoiceActions({ invoiceId, fileName, canClose }: InvoiceActionsProps) {
  const router = useRouter();
  const [printing, setPrinting] = useState(false);
  const [closing, setClosing] = useState(false);

  const generatePdf = async (openPrintView: boolean) => {
    setPrinting(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'Unable to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.open(url, '_blank', 'noopener,noreferrer');
      if (openPrintView) {
        window.open(`/dashboard/invoices/${invoiceId}/print`, '_blank', 'noopener,noreferrer');
        toast.success('Invoice PDF generated and print view opened.');
      } else {
        toast.success('Invoice PDF downloaded successfully.');
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to print invoice');
    } finally {
      setPrinting(false);
    }
  };

  const closeTable = async () => {
    setClosing(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/close`, { method: 'POST' });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to close table');
      }

      toast.success('Table closed and marked available.');
      router.push('/dashboard/pos');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to close table');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" onClick={() => void generatePdf(true)} disabled={printing}>
        {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
        Print invoice
      </Button>
      <Button type="button" variant="outline" onClick={() => void generatePdf(false)} disabled={printing}>
        <Download className="mr-2 h-4 w-4" />
        Download PDF
      </Button>
      {canClose ? (
        <Button type="button" variant="outline" onClick={() => void closeTable()} disabled={closing}>
          {closing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
          Close table
        </Button>
      ) : null}
    </div>
  );
}
