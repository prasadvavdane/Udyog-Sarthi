'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatNumber } from '@/lib/format';

type ReportRow = Record<string, string | number>;

type ReportPayload = {
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: ReportRow[];
  totals: Record<string, string | number>;
  vendorName: string;
  generatedAt: string;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
};

type ReportType =
  | 'daily-sales'
  | 'weekly-sales'
  | 'monthly-sales'
  | 'yearly-sales'
  | 'item-wise-sales'
  | 'table-wise-revenue'
  | 'customer-wise-revenue'
  | 'profit-report'
  | 'tax-report';

const reportOptions: Array<{ value: ReportType; label: string; description: string }> = [
  { value: 'daily-sales', label: 'Daily sales', description: 'Day-wise billing totals and tax.' },
  { value: 'weekly-sales', label: 'Weekly sales', description: 'Week-wise restaurant collections.' },
  { value: 'monthly-sales', label: 'Monthly sales', description: 'Month-on-month bill and tax totals.' },
  { value: 'yearly-sales', label: 'Yearly sales', description: 'Annual revenue and bill count.' },
  { value: 'item-wise-sales', label: 'Item-wise sales', description: 'Quantity sold by menu item.' },
  { value: 'table-wise-revenue', label: 'Table-wise revenue', description: 'Revenue generated per table.' },
  { value: 'customer-wise-revenue', label: 'Customer-wise revenue', description: 'Revenue and visits by customer.' },
  { value: 'profit-report', label: 'Profit report', description: 'Revenue, cost, and profit by item.' },
  { value: 'tax-report', label: 'Tax report', description: 'GST slab-wise taxable value and tax.' },
];

function formatCell(columnKey: string, value: string | number) {
  if (typeof value === 'number') {
    if (/(sales|tax|revenue|cost|profit|taxable|total)$/i.test(columnKey)) {
      return formatCurrency(value);
    }

    return formatNumber(value);
  }

  return value;
}

function toQueryString(reportType: ReportType, from: string, to: string, page = 1, pageSize = 10) {
  const query = new URLSearchParams({
    reportType,
    page: String(page),
    pageSize: String(pageSize),
  });

  if (from) {
    query.set('from', from);
  }

  if (to) {
    query.set('to', to);
  }

  return query.toString();
}

interface ReportsCenterProps {
  initialReport: ReportPayload;
  initialReportType: ReportType;
  initialFrom: string;
  initialTo: string;
}

export function ReportsCenter({
  initialReport,
  initialReportType,
  initialFrom,
  initialTo,
}: ReportsCenterProps) {
  const [reportType, setReportType] = useState<ReportType>(initialReportType);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);

  const loadReport = async (nextPage: number, nextType = reportType, nextFrom = from, nextTo = to) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/reports?${toQueryString(nextType, nextFrom, nextTo, nextPage, report.pageSize)}`);
      const payload = (await response.json()) as ReportPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to load report');
      }

      setReport(payload);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to load report');
    } finally {
      setLoading(false);
    }
  };

  const activeOption = reportOptions.find((option) => option.value === reportType);
  const exportQuery = toQueryString(reportType, from, to, report.page, report.pageSize);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
          <CardDescription>Switch between revenue, tax, customer, table, and profit views with export-ready output.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report type</Label>
              <select
                id="reportType"
                value={reportType}
                onChange={(event) => setReportType(event.target.value as ReportType)}
                className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground shadow-sm focus-visible:border-primary/40 focus-visible:outline-none"
              >
                {reportOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-border bg-white/68 p-4">
            <p className="font-semibold text-foreground">{activeOption?.label}</p>
            <p className="text-sm leading-7 text-muted-foreground">{activeOption?.description}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void loadReport(1)} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Load report
              </Button>
              <Button asChild variant="outline">
                <a href={`/api/reports/export?${exportQuery}&format=pdf`} target="_blank" rel="noreferrer">
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={`/api/reports/export?${exportQuery}&format=csv`} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={`/api/reports/export?${exportQuery}&format=excel`} target="_blank" rel="noreferrer">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5 md:p-6">
            <p className="text-sm text-muted-foreground">Rows</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{formatNumber(report.totalRows)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Structured report rows in the selected time range.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 md:p-6">
            <p className="text-sm text-muted-foreground">Pages</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{formatNumber(report.totalPages)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Paginated table output ready for export.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 md:p-6">
            <p className="text-sm text-muted-foreground">Generated</p>
            <p className="mt-3 text-xl font-semibold text-foreground">
              {new Intl.DateTimeFormat('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }).format(new Date(report.generatedAt))}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{report.vendorName}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{report.title}</CardTitle>
          <CardDescription>Headers, totals, pagination, and export actions are all aligned to the selected report type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  {report.columns.map((column) => (
                    <th key={column.key} className="pb-3 font-medium">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={report.columns.length} className="py-10 text-center text-muted-foreground">
                      No rows found for this date range.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row, index) => (
                    <tr key={`${report.page}-${index}`}>
                      {report.columns.map((column) => (
                        <td key={column.key} className="py-4 text-foreground">
                          {formatCell(column.key, row[column.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  {report.columns.map((column, index) => (
                    <td key={column.key} className="pt-4 font-semibold text-foreground">
                      {index === 0 ? 'Totals' : formatCell(column.key, report.totals[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {report.page} of {report.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={loading || report.page <= 1}
                onClick={() => void loadReport(report.page - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading || report.page >= report.totalPages}
                onClick={() => void loadReport(report.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
