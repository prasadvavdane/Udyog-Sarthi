'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { getInventoryBootstrap } from '@/lib/inventory-service';

export type InventoryBootstrapPayload = Awaited<ReturnType<typeof getInventoryBootstrap>>;

type SectionKey = 'overview' | 'transactions' | 'masters' | 'recipes' | 'reports';
type MasterResource = 'category' | 'unit' | 'supplier' | 'location' | 'item';
type InventoryReportType =
  | 'stock-on-hand'
  | 'low-stock-items'
  | 'expiry-alerts'
  | 'purchase-history'
  | 'consumption-report'
  | 'wastage-report'
  | 'stock-valuation'
  | 'supplier-purchases'
  | 'inventory-movement';

type ReportPayload = {
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number>>;
  totals: Record<string, string | number>;
  generatedAt: string;
  vendorName: string;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
};

const sections: Array<{ key: SectionKey; label: string; note: string }> = [
  { key: 'overview', label: 'Overview', note: 'Stock pulse, alerts, and audit trail' },
  { key: 'transactions', label: 'Transactions', note: 'Inward, outward, cancel, and correct' },
  { key: 'masters', label: 'Masters', note: 'Items, suppliers, units, and locations' },
  { key: 'recipes', label: 'Recipes', note: 'Link menu items to raw materials' },
  { key: 'reports', label: 'Reports', note: 'Exports for stock, expiry, and movement' },
];

const reportOptions: Array<{ value: InventoryReportType; label: string; description: string }> = [
  { value: 'stock-on-hand', label: 'Stock on hand', description: 'Current stock and value by item.' },
  { value: 'low-stock-items', label: 'Low stock', description: 'Items at or below reorder level.' },
  { value: 'expiry-alerts', label: 'Expiry alerts', description: 'Expired and near-expiry lots.' },
  { value: 'purchase-history', label: 'Purchase history', description: 'Inward and GRN movement trail.' },
  { value: 'consumption-report', label: 'Consumption', description: 'Kitchen and sale-based usage.' },
  { value: 'wastage-report', label: 'Wastage', description: 'Damage, wastage, and spoilage movement.' },
  { value: 'stock-valuation', label: 'Stock valuation', description: 'Open stock valuation by lot cost.' },
  { value: 'supplier-purchases', label: 'Supplier purchases', description: 'Supplier-wise inward summary.' },
  { value: 'inventory-movement', label: 'Inventory movement', description: 'Date-wise inward versus outward.' },
];

function formatDate(value: unknown) {
  if (!value) {
    return '-';
  }

  let parsed: Date | null = null;
  if (value instanceof Date) {
    parsed = value;
  } else if (typeof value === 'string' || typeof value === 'number') {
    parsed = new Date(value);
  }

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function monthBackDateInput() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().slice(0, 10);
}

function toDateInput(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return todayDateInput();
}

async function readJson(response: Response) {
  const payload = (await response.json()) as { error?: string } & Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(payload.error ?? 'Request failed'));
  }

  return payload;
}

function formatReportCell(columnKey: string, value: string | number) {
  if (typeof value === 'number') {
    if (/(amount|value|cost|profit)$/i.test(columnKey)) {
      return formatCurrency(value);
    }

    return formatNumber(value);
  }

  return value;
}

interface InventoryControlCenterProps {
  initialData: InventoryBootstrapPayload;
}

export function InventoryControlCenter({ initialData }: InventoryControlCenterProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [data, setData] = useState<InventoryBootstrapPayload>(initialData);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [masterResource, setMasterResource] = useState<MasterResource>('item');
  const [masterEditingId, setMasterEditingId] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportType, setReportType] = useState<InventoryReportType>('stock-on-hand');
  const [reportFrom, setReportFrom] = useState(monthBackDateInput());
  const [reportTo, setReportTo] = useState(todayDateInput());
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState('');
  const [editingRecipeProductId, setEditingRecipeProductId] = useState('');

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', isActive: true });
  const [unitForm, setUnitForm] = useState({ name: '', code: '', precision: '2', isActive: true });
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    notes: '',
    isActive: true,
  });
  const [locationForm, setLocationForm] = useState({
    name: '',
    code: '',
    description: '',
    isPrimary: false,
    isActive: true,
  });
  const [itemForm, setItemForm] = useState({
    itemName: '',
    itemCode: '',
    categoryId: '',
    unitId: '',
    defaultSupplierId: '',
    defaultLocationId: '',
    reorderLevel: '0',
    reorderQuantity: '0',
    expiryTracked: false,
    batchTracked: true,
    allowNegativeStock: false,
    isActive: true,
    notes: '',
  });

  const [transactionForm, setTransactionForm] = useState({
    movementDate: todayDateInput(),
    direction: 'in',
    movementType: 'manual-in',
    reason: '',
    notes: '',
    supplierId: '',
    fromLocationId: '',
    toLocationId: '',
    referenceType: '',
    referenceId: '',
  });
  const [transactionLines, setTransactionLines] = useState([
    {
      inventoryItemId: '',
      locationId: '',
      quantity: '0',
      unitCost: '0',
      batchNumber: '',
      lotNumber: '',
      expiryDate: '',
      purchaseDate: todayDateInput(),
      invoiceNumber: '',
      reason: '',
    },
  ]);

  const [recipeForm, setRecipeForm] = useState({
    productId: '',
    yieldQuantity: '1',
    notes: '',
    isActive: true,
    lines: [
      {
        inventoryItemId: '',
        quantity: '0',
        wastagePercent: '0',
        notes: '',
      },
    ],
  });

  const permissions = new Set(data.permissions);
  const canCreateMaster = permissions.has('inventory.master.create');
  const canEditMaster = permissions.has('inventory.master.edit');
  const canDeleteMaster = permissions.has('inventory.master.delete');
  const canCreateTransaction =
    permissions.has('inventory.transaction.create') || permissions.has('inventory.transaction.adjust');
  const canEditTransaction = permissions.has('inventory.transaction.edit');
  const canCancelTransaction = permissions.has('inventory.transaction.cancel');
  const canManageRecipe = permissions.has('inventory.recipe.manage');
  const canViewReports = permissions.has('inventory.report.view');

  const filteredItems = data.masters.items.filter((item) => {
    const search = itemSearch.trim().toLowerCase();
    if (!search) {
      return true;
    }

    return (
      item.itemName.toLowerCase().includes(search) ||
      item.itemCode.toLowerCase().includes(search) ||
      item.categoryName.toLowerCase().includes(search) ||
      item.defaultLocationName.toLowerCase().includes(search)
    );
  });

  const filteredTransactions = data.recentTransactions.filter((transaction) => {
    const search = transactionSearch.trim().toLowerCase();
    if (!search) {
      return true;
    }

    return (
      transaction.movementNumber.toLowerCase().includes(search) ||
      transaction.reason.toLowerCase().includes(search) ||
      transaction.movementType.toLowerCase().includes(search) ||
      transaction.lines.some((line) => line.itemName.toLowerCase().includes(search))
    );
  });

  const resetMasterForm = () => {
    setMasterEditingId('');
    setCategoryForm({ name: '', description: '', isActive: true });
    setUnitForm({ name: '', code: '', precision: '2', isActive: true });
    setSupplierForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      gstin: '',
      address: '',
      notes: '',
      isActive: true,
    });
    setLocationForm({ name: '', code: '', description: '', isPrimary: false, isActive: true });
    setItemForm({
      itemName: '',
      itemCode: '',
      categoryId: data.masters.categories[0]?.id ?? '',
      unitId: data.masters.units[0]?.id ?? '',
      defaultSupplierId: '',
      defaultLocationId: data.masters.locations[0]?.id ?? '',
      reorderLevel: '0',
      reorderQuantity: '0',
      expiryTracked: false,
      batchTracked: true,
      allowNegativeStock: false,
      isActive: true,
      notes: '',
    });
  };

  const resetTransactionForm = () => {
    setEditingTransactionId('');
    setTransactionForm({
      movementDate: todayDateInput(),
      direction: 'in',
      movementType: 'manual-in',
      reason: '',
      notes: '',
      supplierId: '',
      fromLocationId: '',
      toLocationId: '',
      referenceType: '',
      referenceId: '',
    });
    setTransactionLines([
      {
        inventoryItemId: '',
        locationId: data.masters.locations[0]?.id ?? '',
        quantity: '0',
        unitCost: '0',
        batchNumber: '',
        lotNumber: '',
        expiryDate: '',
        purchaseDate: todayDateInput(),
        invoiceNumber: '',
        reason: '',
      },
    ]);
  };

  const resetRecipeForm = () => {
    setEditingRecipeProductId('');
    setRecipeForm({
      productId: '',
      yieldQuantity: '1',
      notes: '',
      isActive: true,
      lines: [
        {
          inventoryItemId: '',
          quantity: '0',
          wastagePercent: '0',
          notes: '',
        },
      ],
    });
  };

  const refreshDashboard = async () => {
    setLoadingDashboard(true);

    try {
      const response = await fetch('/api/inventory/dashboard', { cache: 'no-store' });
      const payload = (await readJson(response)) as InventoryBootstrapPayload;
      setData(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh inventory dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const buildMasterPayload = () => {
    if (masterResource === 'category') {
      return categoryForm;
    }

    if (masterResource === 'unit') {
      return {
        ...unitForm,
        precision: Number(unitForm.precision || 0),
      };
    }

    if (masterResource === 'supplier') {
      return supplierForm;
    }

    if (masterResource === 'location') {
      return locationForm;
    }

    return {
      ...itemForm,
      reorderLevel: Number(itemForm.reorderLevel || 0),
      reorderQuantity: Number(itemForm.reorderQuantity || 0),
    };
  };

  const submitMaster = async () => {
    try {
      const response = await fetch('/api/inventory/masters', {
        method: masterEditingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(
          masterEditingId
            ? { resource: masterResource, id: masterEditingId, data: buildMasterPayload() }
            : { resource: masterResource, data: buildMasterPayload() },
        ),
      });

      await readJson(response);
      toast.success(masterEditingId ? 'Master updated.' : 'Master created.');
      resetMasterForm();
      await refreshDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save master');
    }
  };

  const loadMasterForEdit = (resource: MasterResource, record: Record<string, unknown>) => {
    setActiveSection('masters');
    setMasterResource(resource);
    setMasterEditingId(String(record.id ?? ''));

    if (resource === 'category') {
      setCategoryForm({
        name: String(record.name ?? ''),
        description: String(record.description ?? ''),
        isActive: Boolean(record.isActive),
      });
      return;
    }

    if (resource === 'unit') {
      setUnitForm({
        name: String(record.name ?? ''),
        code: String(record.code ?? ''),
        precision: String(record.precision ?? 2),
        isActive: Boolean(record.isActive),
      });
      return;
    }

    if (resource === 'supplier') {
      setSupplierForm({
        name: String(record.name ?? ''),
        contactPerson: String(record.contactPerson ?? ''),
        phone: String(record.phone ?? ''),
        email: String(record.email ?? ''),
        gstin: String(record.gstin ?? ''),
        address: String(record.address ?? ''),
        notes: String(record.notes ?? ''),
        isActive: Boolean(record.isActive),
      });
      return;
    }

    if (resource === 'location') {
      setLocationForm({
        name: String(record.name ?? ''),
        code: String(record.code ?? ''),
        description: String(record.description ?? ''),
        isPrimary: Boolean(record.isPrimary),
        isActive: Boolean(record.isActive),
      });
      return;
    }

    setItemForm({
      itemName: String(record.itemName ?? ''),
      itemCode: String(record.itemCode ?? ''),
      categoryId: String(record.categoryId ?? ''),
      unitId: String(record.unitId ?? ''),
      defaultSupplierId: String(record.defaultSupplierId ?? ''),
      defaultLocationId: String(record.defaultLocationId ?? ''),
      reorderLevel: String(record.reorderLevel ?? 0),
      reorderQuantity: String(record.reorderQuantity ?? 0),
      expiryTracked: Boolean(record.expiryTracked),
      batchTracked: Boolean(record.batchTracked),
      allowNegativeStock: Boolean(record.allowNegativeStock),
      isActive: Boolean(record.isActive),
      notes: String(record.notes ?? ''),
    });
  };

  const deactivateMaster = async (resource: MasterResource, id: string) => {
    try {
      const response = await fetch(`/api/inventory/masters?resource=${resource}&id=${id}`, {
        method: 'DELETE',
      });
      await readJson(response);
      toast.success('Master deactivated.');
      if (masterEditingId === id) {
        resetMasterForm();
      }
      await refreshDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete master');
    }
  };

  const submitTransaction = async () => {
    try {
      const payload = {
        ...transactionForm,
        lines: transactionLines.map((line) => ({
          ...line,
          quantity: Number(line.quantity || 0),
          unitCost: Number(line.unitCost || 0),
        })),
      };

      if (editingTransactionId) {
        const correctionReason = window.prompt('Why are you editing this transaction?');
        if (!correctionReason) {
          return;
        }

        const response = await fetch('/api/inventory/transactions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            action: 'replace',
            id: editingTransactionId,
            reason: correctionReason,
            replacement: payload,
          }),
        });
        await readJson(response);
        toast.success('Transaction replaced with stock correction.');
      } else {
        const response = await fetch('/api/inventory/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        await readJson(response);
        toast.success('Transaction posted.');
      }

      resetTransactionForm();
      await refreshDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save transaction');
    }
  };

  const loadTransactionForEdit = (transaction: InventoryBootstrapPayload['recentTransactions'][number]) => {
    setActiveSection('transactions');
    setEditingTransactionId(transaction.id);
    setTransactionForm({
      movementDate: toDateInput(transaction.movementDate),
      direction: transaction.direction === 'out' ? 'out' : 'in',
      movementType: transaction.movementType,
      reason: transaction.reason,
      notes: transaction.notes,
      supplierId: transaction.supplierId || '',
      fromLocationId: '',
      toLocationId: '',
      referenceType: '',
      referenceId: '',
    });
    setTransactionLines(
      transaction.lines.map((line) => ({
        inventoryItemId: line.inventoryItemId,
        locationId: line.locationId,
        quantity: String(line.quantity),
        unitCost: String(line.unitCost),
        batchNumber: line.batchNumber || '',
        lotNumber: line.lotNumber || '',
        expiryDate: '',
        purchaseDate: '',
        invoiceNumber: line.invoiceNumber || '',
        reason: line.reason || '',
      })),
    );
  };

  const cancelTransaction = async (id: string) => {
    const reason = window.prompt('Reason for cancelling this transaction?');
    if (!reason) {
      return;
    }

    try {
      const response = await fetch('/api/inventory/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          id,
          reason,
        }),
      });

      await readJson(response);
      toast.success('Transaction cancelled with reversal.');
      if (editingTransactionId === id) {
        resetTransactionForm();
      }
      await refreshDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel transaction');
    }
  };

  const submitRecipe = async () => {
    try {
      const response = await fetch('/api/inventory/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ...recipeForm,
          yieldQuantity: Number(recipeForm.yieldQuantity || 1),
          lines: recipeForm.lines.map((line) => ({
            ...line,
            quantity: Number(line.quantity || 0),
            wastagePercent: Number(line.wastagePercent || 0),
          })),
        }),
      });

      await readJson(response);
      toast.success(editingRecipeProductId ? 'Recipe updated.' : 'Recipe saved.');
      resetRecipeForm();
      await refreshDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save recipe');
    }
  };

  const loadRecipeForEdit = (recipe: InventoryBootstrapPayload['recipes'][number]) => {
    setActiveSection('recipes');
    setEditingRecipeProductId(recipe.productId);
    setRecipeForm({
      productId: recipe.productId,
      yieldQuantity: String(recipe.yieldQuantity),
      notes: recipe.notes || '',
      isActive: recipe.isActive,
      lines: recipe.lines.map((line) => ({
        inventoryItemId: line.inventoryItemId,
        quantity: String(line.quantity),
        wastagePercent: String(line.wastagePercent || 0),
        notes: line.notes || '',
      })),
    });
  };

  const deleteRecipe = async (productId: string) => {
    try {
      const response = await fetch(`/api/inventory/recipes?productId=${productId}`, { method: 'DELETE' });
      await readJson(response);
      toast.success('Recipe deleted.');
      if (editingRecipeProductId === productId) {
        resetRecipeForm();
      }
      await refreshDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete recipe');
    }
  };

  const loadReport = async (page = 1) => {
    setReportLoading(true);

    try {
      const query = new URLSearchParams({
        reportType,
        from: reportFrom,
        to: reportTo,
        page: String(page),
        pageSize: '10',
      });
      const response = await fetch(`/api/inventory/reports?${query.toString()}`);
      const payload = (await readJson(response)) as ReportPayload;
      setReport(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  const reportQuery = new URLSearchParams({
    reportType,
    from: reportFrom,
    to: reportTo,
  }).toString();

  return (
    <div className="page-grid">
      <PageHeader
        eyebrow="Inventory"
        title="Restaurant inventory control center"
        description="Raw-material stock, lot history, recipe mapping, and billing-linked consumption now sit in one operational workspace."
        badges={[
          `${data.dashboard.totalItems} items`,
          `${data.dashboard.lowStockItems} low stock`,
          `${data.dashboard.expiringLots} expiring lots`,
        ]}
        actions={
          <Button type="button" variant="outline" onClick={() => void refreshDashboard()} disabled={loadingDashboard}>
            {loadingDashboard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <Button
            key={section.key}
            type="button"
            variant={activeSection === section.key ? 'default' : 'outline'}
            onClick={() => setActiveSection(section.key)}
          >
            {section.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-foreground">
              {sections.find((section) => section.key === activeSection)?.label}
            </p>
            <p className="text-sm text-muted-foreground">
              {sections.find((section) => section.key === activeSection)?.note}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">Inward {formatNumber(data.dashboard.movement.inwardQuantity)}</Badge>
            <Badge variant="outline">Outward {formatNumber(data.dashboard.movement.outwardQuantity)}</Badge>
            <Badge variant="outline">Value {formatCurrency(data.dashboard.stockValue)}</Badge>
          </div>
        </CardContent>
      </Card>

      {activeSection === 'overview' ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total items', value: formatNumber(data.dashboard.totalItems), note: 'Active raw materials in this branch.' },
              { label: 'Low stock', value: formatNumber(data.dashboard.lowStockItems), note: 'Reorder attention required now.' },
              { label: 'Stock value', value: formatCurrency(data.dashboard.stockValue), note: 'Open lot valuation at current cost.' },
              { label: 'Expiry alerts', value: formatNumber(data.dashboard.expiringLots + data.dashboard.expiredLots), note: 'Near-expiry plus expired lot count.' },
            ].map((card) => (
              <Card key={card.label}>
                <CardContent className="p-5 md:p-6">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{card.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{card.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Top consumption items</CardTitle>
                <CardDescription>Usage driven by sales, kitchen consumption, and operational outward entries.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.dashboard.topConsumption.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-border bg-white/50 px-4 py-10 text-center text-sm text-muted-foreground">
                    No consumption history yet.
                  </div>
                ) : (
                  data.dashboard.topConsumption.map((entry) => (
                    <div key={entry.inventoryItemId} className="flex items-center justify-between rounded-[24px] border border-border bg-white/68 px-4 py-4">
                      <div>
                        <p className="font-semibold text-foreground">{entry.itemName}</p>
                        <p className="text-sm text-muted-foreground">Consumed quantity {formatNumber(entry.quantity)}</p>
                      </div>
                      <p className="font-semibold text-foreground">{formatCurrency(entry.amount)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audit trail</CardTitle>
                <CardDescription>Recent master and transaction changes with timestamps.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentAudits.map((audit) => (
                  <div key={audit.id} className="rounded-[24px] border border-border bg-white/68 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{audit.action}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(audit.createdAt)}</span>
                    </div>
                    <p className="mt-3 font-semibold text-foreground">{audit.entityType}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{audit.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle>Low stock snapshot</CardTitle>
                <CardDescription>Items that need reorder action before billing or kitchen usage gets blocked.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.masters.items.filter((item) => item.currentStock <= item.reorderLevel).slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-[24px] border border-border bg-white/68 px-4 py-4">
                    <div>
                      <p className="font-semibold text-foreground">{item.itemName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.categoryName} · {item.defaultLocationName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatNumber(item.currentStock)}</p>
                      <p className="text-xs text-muted-foreground">Reorder at {formatNumber(item.reorderLevel)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expiry watch</CardTitle>
                <CardDescription>Near-expiry and expired lots from current open stock.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...data.expiringLots, ...data.expiredLots].slice(0, 8).map((lot) => (
                  <div key={lot.id} className="flex items-center justify-between rounded-[24px] border border-border bg-white/68 px-4 py-4">
                    <div>
                      <p className="font-semibold text-foreground">{lot.itemName}</p>
                      <p className="text-sm text-muted-foreground">
                        {(lot.batchNumber || lot.lotNumber || 'No batch')} · {lot.locationName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatDate(lot.expiryDate)}</p>
                      <p className="text-xs text-muted-foreground">Qty {formatNumber(lot.quantityAvailable)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {activeSection === 'masters' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Master maintenance</CardTitle>
              <CardDescription>Create or update inventory categories, units, suppliers, locations, and stock items.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['item', 'category', 'unit', 'supplier', 'location'] as MasterResource[]).map((resource) => (
                  <Button
                    key={resource}
                    type="button"
                    variant={masterResource === resource ? 'default' : 'outline'}
                    onClick={() => {
                      setMasterResource(resource);
                      setMasterEditingId('');
                    }}
                  >
                    {resource}
                  </Button>
                ))}
              </div>

              {masterResource === 'category' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">Category name</Label>
                    <Input id="categoryName" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryDescription">Description</Label>
                    <Input id="categoryDescription" value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} />
                  </div>
                </div>
              ) : null}

              {masterResource === 'unit' ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="unitName">Unit name</Label>
                    <Input id="unitName" value={unitForm.name} onChange={(event) => setUnitForm((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitCode">Code</Label>
                    <Input id="unitCode" value={unitForm.code} onChange={(event) => setUnitForm((current) => ({ ...current, code: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrecision">Precision</Label>
                    <Input id="unitPrecision" type="number" min={0} max={4} value={unitForm.precision} onChange={(event) => setUnitForm((current) => ({ ...current, precision: event.target.value }))} />
                  </div>
                </div>
              ) : null}

              {masterResource === 'supplier' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="supplierName">Supplier</Label>
                    <Input id="supplierName" value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplierContact">Contact person</Label>
                    <Input id="supplierContact" value={supplierForm.contactPerson} onChange={(event) => setSupplierForm((current) => ({ ...current, contactPerson: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplierPhone">Phone</Label>
                    <Input id="supplierPhone" value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplierEmail">Email</Label>
                    <Input id="supplierEmail" value={supplierForm.email} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplierGstin">GSTIN</Label>
                    <Input id="supplierGstin" value={supplierForm.gstin} onChange={(event) => setSupplierForm((current) => ({ ...current, gstin: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplierAddress">Address</Label>
                    <Input id="supplierAddress" value={supplierForm.address} onChange={(event) => setSupplierForm((current) => ({ ...current, address: event.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="supplierNotes">Notes</Label>
                    <Textarea id="supplierNotes" value={supplierForm.notes} onChange={(event) => setSupplierForm((current) => ({ ...current, notes: event.target.value }))} />
                  </div>
                </div>
              ) : null}

              {masterResource === 'location' ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="locationName">Location</Label>
                    <Input id="locationName" value={locationForm.name} onChange={(event) => setLocationForm((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationCode">Code</Label>
                    <Input id="locationCode" value={locationForm.code} onChange={(event) => setLocationForm((current) => ({ ...current, code: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationDescription">Description</Label>
                    <Input id="locationDescription" value={locationForm.description} onChange={(event) => setLocationForm((current) => ({ ...current, description: event.target.value }))} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={locationForm.isPrimary} onChange={(event) => setLocationForm((current) => ({ ...current, isPrimary: event.target.checked }))} />
                    Primary location
                  </label>
                </div>
              ) : null}

              {masterResource === 'item' ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2 xl:col-span-2">
                    <Label htmlFor="itemName">Item name</Label>
                    <Input id="itemName" value={itemForm.itemName} onChange={(event) => setItemForm((current) => ({ ...current, itemName: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemCode">Item code</Label>
                    <Input id="itemCode" value={itemForm.itemCode} onChange={(event) => setItemForm((current) => ({ ...current, itemCode: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemCategory">Category</Label>
                    <select id="itemCategory" value={itemForm.categoryId} onChange={(event) => setItemForm((current) => ({ ...current, categoryId: event.target.value }))} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                      <option value="">Select</option>
                      {data.masters.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemUnit">Unit</Label>
                    <select id="itemUnit" value={itemForm.unitId} onChange={(event) => setItemForm((current) => ({ ...current, unitId: event.target.value }))} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                      <option value="">Select</option>
                      {data.masters.units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} ({unit.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemSupplier">Default supplier</Label>
                    <select id="itemSupplier" value={itemForm.defaultSupplierId} onChange={(event) => setItemForm((current) => ({ ...current, defaultSupplierId: event.target.value }))} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                      <option value="">Select</option>
                      {data.masters.suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemLocation">Default location</Label>
                    <select id="itemLocation" value={itemForm.defaultLocationId} onChange={(event) => setItemForm((current) => ({ ...current, defaultLocationId: event.target.value }))} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                      <option value="">Select</option>
                      {data.masters.locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemReorderLevel">Reorder level</Label>
                    <Input id="itemReorderLevel" type="number" min={0} value={itemForm.reorderLevel} onChange={(event) => setItemForm((current) => ({ ...current, reorderLevel: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemReorderQty">Reorder quantity</Label>
                    <Input id="itemReorderQty" type="number" min={0} value={itemForm.reorderQuantity} onChange={(event) => setItemForm((current) => ({ ...current, reorderQuantity: event.target.value }))} />
                  </div>
                  <div className="space-y-2 xl:col-span-4">
                    <Label htmlFor="itemNotes">Notes</Label>
                    <Textarea id="itemNotes" value={itemForm.notes} onChange={(event) => setItemForm((current) => ({ ...current, notes: event.target.value }))} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={itemForm.expiryTracked} onChange={(event) => setItemForm((current) => ({ ...current, expiryTracked: event.target.checked }))} />
                    Track expiry
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={itemForm.batchTracked} onChange={(event) => setItemForm((current) => ({ ...current, batchTracked: event.target.checked }))} />
                    Track batch/lot
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={itemForm.allowNegativeStock} onChange={(event) => setItemForm((current) => ({ ...current, allowNegativeStock: event.target.checked }))} />
                    Allow negative stock
                  </label>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void submitMaster()} disabled={!canCreateMaster && !canEditMaster}>
                  <Plus className="mr-2 h-4 w-4" />
                  {masterEditingId ? 'Update master' : 'Create master'}
                </Button>
                <Button type="button" variant="outline" onClick={resetMasterForm}>
                  Reset form
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory item register</CardTitle>
              <CardDescription>Search, review, edit, or deactivate stock masters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <Input placeholder="Search item, code, category, or location" value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} />
                <Badge variant="outline">{filteredItems.length} items</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Item</th>
                      <th className="pb-3 font-medium">Code</th>
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 font-medium">Stock</th>
                      <th className="pb-3 font-medium">Reorder</th>
                      <th className="pb-3 font-medium">Location</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-4">
                          <div>
                            <p className="font-semibold text-foreground">{item.itemName}</p>
                            <p className="text-xs text-muted-foreground">{item.unitName}</p>
                          </div>
                        </td>
                        <td className="py-4 text-foreground">{item.itemCode}</td>
                        <td className="py-4 text-muted-foreground">{item.categoryName}</td>
                        <td className="py-4 text-foreground">
                          <span className={item.lowStock ? 'font-semibold text-destructive' : 'font-semibold'}>
                            {formatNumber(item.currentStock)}
                          </span>
                        </td>
                        <td className="py-4 text-muted-foreground">{formatNumber(item.reorderLevel)}</td>
                        <td className="py-4 text-muted-foreground">{item.defaultLocationName}</td>
                        <td className="py-4">
                          <div className="flex gap-2">
                            {canEditMaster ? (
                              <Button type="button" size="sm" variant="outline" onClick={() => loadMasterForEdit('item', item as unknown as Record<string, unknown>)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                            ) : null}
                            {canDeleteMaster ? (
                              <Button type="button" size="sm" variant="outline" onClick={() => void deactivateMaster('item', item.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deactivate
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {[
              {
                title: 'Categories',
                resource: 'category' as const,
                records: data.masters.categories,
                note: 'Item grouping for stock, reports, and reorder views.',
              },
              {
                title: 'Units',
                resource: 'unit' as const,
                records: data.masters.units,
                note: 'Base measurement for quantity and recipe consumption.',
              },
              {
                title: 'Suppliers',
                resource: 'supplier' as const,
                records: data.masters.suppliers,
                note: 'Vendor mapping for GRN, purchase history, and supplier reports.',
              },
              {
                title: 'Locations',
                resource: 'location' as const,
                records: data.masters.locations,
                note: 'Stock rooms, branch counters, and issue destinations.',
              },
            ].map((group) => (
              <Card key={group.resource}>
                <CardHeader>
                  <CardTitle>{group.title}</CardTitle>
                  <CardDescription>{group.note}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.records.map((record) => (
                    <div key={record.id} className="rounded-[24px] border border-border bg-white/68 px-4 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">
                            {record.name}
                            {'code' in record && record.code ? ` (${record.code})` : ''}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {'description' in record && record.description ? record.description : ''}
                            {'contactPerson' in record && record.contactPerson ? record.contactPerson : ''}
                            {'address' in record && record.address ? record.address : ''}
                            {'isPrimary' in record && record.isPrimary ? 'Primary location' : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {canEditMaster ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => loadMasterForEdit(group.resource, record as unknown as Record<string, unknown>)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          ) : null}
                          {canDeleteMaster ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => void deactivateMaster(group.resource, record.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deactivate
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      {activeSection === 'transactions' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Post stock movement</CardTitle>
              <CardDescription>Use one form for manual inward, GRN, kitchen issue, wastage, vendor return, or adjustment entries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="movementDate">Date</Label>
                  <Input id="movementDate" type="date" value={transactionForm.movementDate} onChange={(event) => setTransactionForm((current) => ({ ...current, movementDate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direction">Direction</Label>
                  <select id="direction" value={transactionForm.direction} onChange={(event) => setTransactionForm((current) => ({ ...current, direction: event.target.value, movementType: event.target.value === 'in' ? 'manual-in' : 'kitchen-consumption' }))} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                    <option value="in">Inward</option>
                    <option value="out">Outward</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="movementType">Movement type</Label>
                  <select id="movementType" value={transactionForm.movementType} onChange={(event) => setTransactionForm((current) => ({ ...current, movementType: event.target.value }))} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                    {(transactionForm.direction === 'in'
                      ? ['manual-in', 'purchase-grn', 'supplier-receipt', 'correction-in']
                      : ['kitchen-consumption', 'branch-issue', 'damage', 'wastage', 'spoilage', 'vendor-return', 'manual-adjustment']
                    ).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Supplier</Label>
                  <select id="supplierId" value={transactionForm.supplierId} onChange={(event) => setTransactionForm((current) => ({ ...current, supplierId: event.target.value }))} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                    <option value="">Select</option>
                    {data.masters.suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="movementReason">Reason</Label>
                  <Input id="movementReason" value={transactionForm.reason} onChange={(event) => setTransactionForm((current) => ({ ...current, reason: event.target.value }))} />
                </div>
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="movementNotes">Notes</Label>
                  <Input id="movementNotes" value={transactionForm.notes} onChange={(event) => setTransactionForm((current) => ({ ...current, notes: event.target.value }))} />
                </div>
              </div>

              <div className="space-y-3">
                {transactionLines.map((line, index) => (
                  <div key={`${index}-${line.inventoryItemId}`} className="rounded-[24px] border border-border bg-white/68 p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <div className="space-y-2 xl:col-span-2">
                        <Label>Item</Label>
                        <select value={line.inventoryItemId} onChange={(event) => setTransactionLines((current) => current.map((entry, lineIndex) => lineIndex === index ? { ...entry, inventoryItemId: event.target.value } : entry))} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                          <option value="">Select</option>
                          {data.masters.items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.itemName} ({item.itemCode})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <select value={line.locationId} onChange={(event) => setTransactionLines((current) => current.map((entry, lineIndex) => lineIndex === index ? { ...entry, locationId: event.target.value } : entry))} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                          <option value="">Select</option>
                          {data.masters.locations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input type="number" min={0} step="0.001" value={line.quantity} onChange={(event) => setTransactionLines((current) => current.map((entry, lineIndex) => lineIndex === index ? { ...entry, quantity: event.target.value } : entry))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit cost</Label>
                        <Input type="number" min={0} step="0.01" value={line.unitCost} onChange={(event) => setTransactionLines((current) => current.map((entry, lineIndex) => lineIndex === index ? { ...entry, unitCost: event.target.value } : entry))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Batch</Label>
                        <Input value={line.batchNumber} onChange={(event) => setTransactionLines((current) => current.map((entry, lineIndex) => lineIndex === index ? { ...entry, batchNumber: event.target.value } : entry))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Lot</Label>
                        <Input value={line.lotNumber} onChange={(event) => setTransactionLines((current) => current.map((entry, lineIndex) => lineIndex === index ? { ...entry, lotNumber: event.target.value } : entry))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry</Label>
                        <Input type="date" value={line.expiryDate} onChange={(event) => setTransactionLines((current) => current.map((entry, lineIndex) => lineIndex === index ? { ...entry, expiryDate: event.target.value } : entry))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Purchase date</Label>
                        <Input type="date" value={line.purchaseDate} onChange={(event) => setTransactionLines((current) => current.map((entry, lineIndex) => lineIndex === index ? { ...entry, purchaseDate: event.target.value } : entry))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Invoice no</Label>
                        <Input value={line.invoiceNumber} onChange={(event) => setTransactionLines((current) => current.map((entry, lineIndex) => lineIndex === index ? { ...entry, invoiceNumber: event.target.value } : entry))} />
                      </div>
                      <div className="space-y-2 xl:col-span-5">
                        <Label>Line reason</Label>
                        <Input value={line.reason} onChange={(event) => setTransactionLines((current) => current.map((entry, lineIndex) => lineIndex === index ? { ...entry, reason: event.target.value } : entry))} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setTransactionLines((current) => [...current, { inventoryItemId: '', locationId: data.masters.locations[0]?.id ?? '', quantity: '0', unitCost: '0', batchNumber: '', lotNumber: '', expiryDate: '', purchaseDate: todayDateInput(), invoiceNumber: '', reason: '' }])}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add line
                </Button>
                <Button type="button" onClick={() => void submitTransaction()} disabled={!canCreateTransaction && !canEditTransaction}>
                  {editingTransactionId ? 'Replace transaction' : 'Post transaction'}
                </Button>
                <Button type="button" variant="outline" onClick={resetTransactionForm}>
                  Reset form
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Movement log</CardTitle>
              <CardDescription>Search posted transactions, inspect lines, and reverse or replace entries with audit correction.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <Input placeholder="Search movement number, reason, type, or item" value={transactionSearch} onChange={(event) => setTransactionSearch(event.target.value)} />
                <Badge variant="outline">{filteredTransactions.length} transactions</Badge>
              </div>

              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="rounded-[24px] border border-border bg-white/68 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{transaction.movementNumber}</p>
                          <Badge variant={transaction.direction === 'in' ? 'outline' : 'secondary'}>{transaction.direction}</Badge>
                          <Badge variant={transaction.status === 'cancelled' ? 'destructive' : 'outline'}>{transaction.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(transaction.movementDate)} · {transaction.movementType}
                        </p>
                        <p className="text-sm text-muted-foreground">{transaction.reason}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Qty {formatNumber(transaction.totalQuantity)}</Badge>
                        <Badge variant="outline">{formatCurrency(transaction.totalAmount)}</Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {transaction.lines.map((line, index) => (
                        <div key={`${transaction.id}-${index}`} className="rounded-2xl border border-border bg-white/78 px-4 py-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-medium text-foreground">{line.itemName}</p>
                              <p className="text-sm text-muted-foreground">
                                {line.locationName} · Qty {formatNumber(line.quantity)} · {line.unitName}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-foreground">{formatCurrency(line.totalAmount)}</p>
                              <p className="text-xs text-muted-foreground">
                                {line.batchNumber || line.lotNumber || 'No batch'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {canEditTransaction && transaction.status !== 'cancelled' ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => loadTransactionForEdit(transaction)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      ) : null}
                      {canCancelTransaction && transaction.status !== 'cancelled' ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => void cancelTransaction(transaction.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {activeSection === 'recipes' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Recipe mapping</CardTitle>
              <CardDescription>Link menu items to raw ingredients so invoice finalization can deduct inventory automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="recipeProduct">Menu item</Label>
                  <select id="recipeProduct" value={recipeForm.productId} onChange={(event) => setRecipeForm((current) => ({ ...current, productId: event.target.value }))} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                    <option value="">Select</option>
                    {data.products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.productName} ({product.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yieldQuantity">Yield quantity</Label>
                  <Input id="yieldQuantity" type="number" min={0.001} step="0.001" value={recipeForm.yieldQuantity} onChange={(event) => setRecipeForm((current) => ({ ...current, yieldQuantity: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipeNotes">Notes</Label>
                  <Input id="recipeNotes" value={recipeForm.notes} onChange={(event) => setRecipeForm((current) => ({ ...current, notes: event.target.value }))} />
                </div>
              </div>

              <div className="space-y-3">
                {recipeForm.lines.map((line, index) => (
                  <div key={`${index}-${line.inventoryItemId}`} className="rounded-[24px] border border-border bg-white/68 p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2 xl:col-span-2">
                        <Label>Ingredient</Label>
                        <select value={line.inventoryItemId} onChange={(event) => setRecipeForm((current) => ({ ...current, lines: current.lines.map((entry, lineIndex) => lineIndex === index ? { ...entry, inventoryItemId: event.target.value } : entry) }))} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                          <option value="">Select</option>
                          {data.masters.items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.itemName} ({item.unitName})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity per menu unit</Label>
                        <Input type="number" min={0.001} step="0.001" value={line.quantity} onChange={(event) => setRecipeForm((current) => ({ ...current, lines: current.lines.map((entry, lineIndex) => lineIndex === index ? { ...entry, quantity: event.target.value } : entry) }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Wastage %</Label>
                        <Input type="number" min={0} step="0.01" value={line.wastagePercent} onChange={(event) => setRecipeForm((current) => ({ ...current, lines: current.lines.map((entry, lineIndex) => lineIndex === index ? { ...entry, wastagePercent: event.target.value } : entry) }))} />
                      </div>
                      <div className="space-y-2 xl:col-span-4">
                        <Label>Line notes</Label>
                        <Input value={line.notes} onChange={(event) => setRecipeForm((current) => ({ ...current, lines: current.lines.map((entry, lineIndex) => lineIndex === index ? { ...entry, notes: event.target.value } : entry) }))} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setRecipeForm((current) => ({ ...current, lines: [...current.lines, { inventoryItemId: '', quantity: '0', wastagePercent: '0', notes: '' }] }))}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add ingredient
                </Button>
                <Button type="button" onClick={() => void submitRecipe()} disabled={!canManageRecipe}>
                  {editingRecipeProductId ? 'Update recipe' : 'Save recipe'}
                </Button>
                <Button type="button" variant="outline" onClick={resetRecipeForm}>
                  Reset form
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recipe catalog</CardTitle>
              <CardDescription>Menu-to-ingredient mapping with estimated food cost based on current inventory cost.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.recipes.map((recipe) => (
                <div key={recipe.id} className="rounded-[24px] border border-border bg-white/68 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{recipe.productName}</p>
                        <Badge variant="outline">{recipe.productCategory}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Yield {formatNumber(recipe.yieldQuantity)} · Estimated cost {formatCurrency(recipe.estimatedCost)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {canManageRecipe ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => loadRecipeForEdit(recipe)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      ) : null}
                      {canManageRecipe ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => void deleteRecipe(recipe.productId)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {recipe.lines.map((line, index) => (
                      <div key={`${recipe.id}-${index}`} className="rounded-2xl border border-border bg-white/78 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{line.itemName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatNumber(line.quantity)} {line.unitName} · Wastage {formatNumber(line.wastagePercent ?? 0)}%
                            </p>
                          </div>
                          <p className="font-medium text-foreground">{formatCurrency(line.lineCost)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      {activeSection === 'reports' ? (
        <>
          {!canViewReports ? (
            <Card>
              <CardContent className="p-6 text-sm leading-7 text-muted-foreground">
                Report exports are enabled only for roles with inventory reporting access. You can still review live stock, movements, and alerts from the overview and transaction sections.
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Inventory reports</CardTitle>
              <CardDescription>Load date-bound inventory reports and export PDF, CSV, or Excel files.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="reportType">Report type</Label>
                  <select id="reportType" value={reportType} onChange={(event) => setReportType(event.target.value as InventoryReportType)} className="flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 text-sm text-foreground">
                    {reportOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportFrom">From</Label>
                  <Input id="reportFrom" type="date" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportTo">To</Label>
                  <Input id="reportTo" type="date" value={reportTo} onChange={(event) => setReportTo(event.target.value)} />
                </div>
              </div>

              <div className="space-y-3 rounded-[24px] border border-border bg-white/68 p-4">
                <p className="font-semibold text-foreground">
                  {reportOptions.find((option) => option.value === reportType)?.label}
                </p>
                <p className="text-sm leading-7 text-muted-foreground">
                  {reportOptions.find((option) => option.value === reportType)?.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void loadReport()} disabled={!canViewReports || reportLoading}>
                    {reportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Load report
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <a href={`/api/inventory/reports/export?${reportQuery}&format=pdf`} target="_blank" rel="noreferrer">
                      <FileText className="mr-2 h-4 w-4" />
                      PDF
                    </a>
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <a href={`/api/inventory/reports/export?${reportQuery}&format=csv`} target="_blank" rel="noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </a>
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <a href={`/api/inventory/reports/export?${reportQuery}&format=excel`} target="_blank" rel="noreferrer">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Excel
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {report ? (
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{report.title}</CardTitle>
                <CardDescription>
                  Generated {formatDate(report.generatedAt)} · {report.vendorName}
                </CardDescription>
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
                      {report.rows.map((row, index) => (
                        <tr key={`${report.page}-${index}`}>
                          {report.columns.map((column) => (
                            <td key={column.key} className="py-4 text-foreground">
                              {formatReportCell(column.key, row[column.key] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border">
                        {report.columns.map((column, index) => (
                          <td key={column.key} className="pt-4 font-semibold text-foreground">
                            {index === 0 ? 'Totals' : formatReportCell(column.key, report.totals[column.key] ?? '')}
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
                    <Button type="button" variant="outline" disabled={report.page <= 1 || reportLoading} onClick={() => void loadReport(report.page - 1)}>
                      Previous
                    </Button>
                    <Button type="button" variant="outline" disabled={report.page >= report.totalPages || reportLoading} onClick={() => void loadReport(report.page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
