'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ProductRow = {
  id: string;
  productName: string;
  category: string;
  sellingPrice: number;
  buyingPrice: number;
  stockQuantity: number;
  GSTPercentage: number;
  description?: string;
  imageUrl?: string;
  foodType: 'veg' | 'non-veg';
  activeStatus: boolean;
  isAvailable: boolean;
  reorderLevel: number;
  SKU: string;
  barcode?: string;
  HSN_SAC: string;
};

type ParsedSheetRow = Record<string, string | number | boolean>;

const templateColumns = [
  { key: 'productName', label: 'Product name', required: true },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Selling price', required: true },
  { key: 'costPrice', label: 'Buying price' },
  { key: 'stock', label: 'Stock quantity' },
  { key: 'GST', label: 'GST %' },
  { key: 'description', label: 'Description' },
  { key: 'imageUrl', label: 'Image URL' },
  { key: 'foodType', label: 'Veg / Non-veg' },
  { key: 'reorderLevel', label: 'Reorder level' },
  { key: 'HSN_SAC', label: 'HSN / SAC' },
  { key: 'SKU', label: 'SKU' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'activeStatus', label: 'Active status' },
  { key: 'isAvailable', label: 'Available for billing' },
] as const;

const templateHeaders = templateColumns.map((column) => column.key);

const defaultValues: Record<
  'category' | 'GST' | 'HSN_SAC' | 'foodType' | 'reorderLevel' | 'costPrice' | 'stock' | 'activeStatus' | 'isAvailable',
  string
> = {
  category: 'General',
  GST: '18',
  HSN_SAC: '996331',
  foodType: 'veg',
  reorderLevel: '5',
  costPrice: '0',
  stock: '0',
  activeStatus: 'true',
  isAvailable: 'true',
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_\s-]+/g, '');
}

function buildTemplateRows() {
  return [
    {
      productName: 'Paneer Tikka',
      category: 'Starters',
      price: 220,
      costPrice: 110,
      stock: 50,
      GST: 5,
      description: 'Popular starter',
      imageUrl: '',
      foodType: 'veg',
      reorderLevel: 10,
      HSN_SAC: '996331',
      SKU: '',
      barcode: '',
      activeStatus: 'true',
      isAvailable: 'true',
    },
    {
      productName: 'Veg Biryani',
      category: 'Main Course',
      price: 180,
      costPrice: 90,
      stock: 40,
      GST: 5,
      description: 'Best seller',
      imageUrl: '',
      foodType: 'veg',
      reorderLevel: 12,
      HSN_SAC: '996331',
      SKU: '',
      barcode: '',
      activeStatus: 'true',
      isAvailable: 'true',
    },
  ];
}

interface ProductImporterProps {
  onImported: (products: ProductRow[]) => void;
}

export function ProductImporter({ onImported }: ProductImporterProps) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedSheetRow[]>([]);
  const [defaults, setDefaults] = useState(defaultValues);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Array<{ rowNumber: number; productName: string; error: string }>>([]);

  const previewRows = rows.slice(0, 5);

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(buildTemplateRows(), {
      header: templateHeaders as string[],
    });

    XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
    XLSX.writeFile(workbook, 'product-import-template.xlsx');
  };

  const updateDefault = (field: keyof typeof defaultValues, value: string) => {
    setDefaults((current) => ({ ...current, [field]: value }));
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        throw new Error('No worksheet found in the uploaded file.');
      }

      const rawRows = XLSX.utils.sheet_to_json<Array<string | number | boolean>>(sheet, {
        header: 1,
        defval: '',
        raw: false,
      });

      const [headerRow, ...dataRows] = rawRows;
      const uploadedHeaders = Array.isArray(headerRow)
        ? headerRow.map((value) => String(value || '').trim())
        : [];

      if (uploadedHeaders.length === 0) {
        throw new Error('The first row must contain the standard product template headers.');
      }

      const normalizedIndex = new Map(
        uploadedHeaders.map((header, index) => [normalizeHeader(header), index]),
      );

      const missingHeaders = templateHeaders.filter(
        (header) => !normalizedIndex.has(normalizeHeader(header)),
      );

      if (missingHeaders.length > 0) {
        throw new Error(
          `Use the downloaded product template. Missing columns: ${missingHeaders.join(', ')}`,
        );
      }

      const parsedRows = dataRows
        .map((row) =>
          templateHeaders.reduce((result, header) => {
            const columnIndex = normalizedIndex.get(normalizeHeader(header));
            result[header] = columnIndex === undefined ? '' : row?.[columnIndex] ?? '';
            return result;
          }, {} as ParsedSheetRow),
        )
        .filter((row) =>
          templateHeaders.some((header) => String(row[header] ?? '').trim() !== ''),
        );

      setFileName(file.name);
      setRows(parsedRows);
      setErrors([]);

      toast.success(`Loaded ${parsedRows.length} product rows from ${file.name}.`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to read the Excel file.');
      event.target.value = '';
    }
  };

  const buildPayloadRows = () => {
    return rows.map((row) =>
      templateHeaders.reduce<Record<string, string | number | boolean>>((result, header) => {
        const cellValue = row[header];

        if (cellValue !== '' && cellValue !== undefined) {
          result[header] = cellValue;
          return result;
        }

        if (header in defaults) {
          result[header] = defaults[header as keyof typeof defaultValues];
        }

        return result;
      }, {}),
    );
  };

  const importProducts = async () => {
    if (rows.length === 0) {
      toast.error('Upload the filled product template first.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: buildPayloadRows() }),
      });

      const payload = (await response.json()) as {
        error?: string;
        products?: ProductRow[];
        errors?: Array<{ rowNumber: number; productName: string; error: string }>;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to import product sheet.');
      }

      const importedProducts = payload.products ?? [];
      const failedRows = payload.errors ?? [];

      if (importedProducts.length > 0) {
        onImported(importedProducts);
      }

      setErrors(failedRows);

      if (importedProducts.length > 0) {
        toast.success(
          failedRows.length > 0
            ? `${importedProducts.length} items imported. ${failedRows.length} rows need attention.`
            : `${importedProducts.length} items imported successfully.`,
        );
      } else {
        toast.error('No rows were imported. Please review the template data.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to import product sheet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import menu items from Excel
            </CardTitle>
            <CardDescription>
              Download the standard product sheet, fill the same columns, and upload it back. No manual mapping is needed.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="min-w-0 space-y-4 rounded-[28px] border border-border bg-white/72 p-4">
            <div className="space-y-2">
              <Label htmlFor="product-import-file">Upload completed product sheet</Label>
              <Input
                id="product-import-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => void handleFileUpload(event)}
              />
              <p className="text-xs text-muted-foreground">
                Upload the same template format. Extra columns are ignored, but all standard template columns must exist.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              {fileName ? `Loaded file: ${fileName} (${rows.length} rows)` : 'No file uploaded yet.'}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Template columns</p>
              <div className="flex flex-wrap gap-2">
                {templateHeaders.map((header) => (
                  <span
                    key={header}
                    className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs text-muted-foreground"
                  >
                    {header}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-4 rounded-[28px] border border-border bg-white/72 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Fallback values for blank cells</h3>
              <p className="text-xs text-muted-foreground">
                These are only used when a row leaves a template cell empty. SKU and barcode stay auto-generated when blank.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="default-category">Default category</Label>
                <Input
                  id="default-category"
                  value={defaults.category}
                  onChange={(event) => updateDefault('category', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-gst">Default GST %</Label>
                <Input
                  id="default-gst"
                  value={defaults.GST}
                  onChange={(event) => updateDefault('GST', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-stock">Default stock</Label>
                <Input
                  id="default-stock"
                  value={defaults.stock}
                  onChange={(event) => updateDefault('stock', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-cost">Default buying price</Label>
                <Input
                  id="default-cost"
                  value={defaults.costPrice}
                  onChange={(event) => updateDefault('costPrice', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-food-type">Default food type</Label>
                <select
                  id="default-food-type"
                  value={defaults.foodType}
                  onChange={(event) => updateDefault('foodType', event.target.value)}
                  className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground shadow-sm focus-visible:border-primary/40 focus-visible:outline-none"
                >
                  <option value="veg">Veg</option>
                  <option value="non-veg">Non-veg</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-hsn">Default HSN / SAC</Label>
                <Input
                  id="default-hsn"
                  value={defaults.HSN_SAC}
                  onChange={(event) => updateDefault('HSN_SAC', event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3 rounded-[28px] border border-border bg-white/72 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Preview</h3>
              <p className="text-xs text-muted-foreground">
                This preview reads the standard template directly, so the same data will be imported without any remapping step.
              </p>
            </div>
            <Button type="button" onClick={() => void importProducts()} disabled={loading || rows.length === 0}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import products
            </Button>
          </div>

          <div className="max-w-full overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  {templateHeaders.map((header) => (
                    <th key={header} className="px-3 py-2 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white/80">
                {previewRows.length > 0 ? (
                  previewRows.map((row, rowIndex) => (
                    <tr key={`preview-${rowIndex}`}>
                      {templateHeaders.map((header) => (
                        <td key={`${rowIndex}-${header}`} className="px-3 py-2 text-foreground">
                          {String(row[header] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-3 py-4 text-muted-foreground"
                      colSpan={templateHeaders.length}
                    >
                      Product rows will appear here after you upload the filled template.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {errors.length > 0 ? (
          <div className="space-y-3 rounded-[28px] border border-amber-300/60 bg-amber-50/80 p-4">
            <div>
              <h3 className="text-sm font-semibold text-amber-950">Rows needing attention</h3>
              <p className="text-xs text-amber-800">
                Fix these rows in the same template and import again. Successful rows are already saved.
              </p>
            </div>
            <div className="space-y-2">
              {errors.slice(0, 10).map((error) => (
                <div
                  key={`${error.rowNumber}-${error.productName}`}
                  className="rounded-2xl border border-amber-200 bg-white/80 px-3 py-3 text-sm"
                >
                  <p className="font-medium text-amber-950">
                    Row {error.rowNumber} - {error.productName}
                  </p>
                  <p className="text-amber-800">{error.error}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
