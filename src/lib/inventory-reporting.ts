import InventoryCategory from '@/models/InventoryCategory';
import InventoryItem from '@/models/InventoryItem';
import InventoryLocation from '@/models/InventoryLocation';
import InventoryLot from '@/models/InventoryLot';
import InventorySupplier from '@/models/InventorySupplier';
import InventoryTransaction from '@/models/InventoryTransaction';
import InventoryUnit from '@/models/InventoryUnit';
import Settings from '@/models/Settings';
import dbConnect from '@/lib/mongodb';
import type { ReportOutput } from '@/lib/reporting';

type InventoryReportLine = {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
  reason?: string;
  invoiceNumber?: string;
};

export type InventoryReportType =
  | 'stock-on-hand'
  | 'low-stock-items'
  | 'expiry-alerts'
  | 'purchase-history'
  | 'consumption-report'
  | 'wastage-report'
  | 'stock-valuation'
  | 'supplier-purchases'
  | 'inventory-movement';

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function parseDateRange(from?: string, to?: string) {
  const fallback = defaultRange();
  return {
    start: from ? new Date(from) : fallback.start,
    end: to ? new Date(to) : fallback.end,
  };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roundValue(value: number, precision = 2) {
  return Number(Number(value).toFixed(precision));
}

export async function buildInventoryReportData(
  tenantId: string,
  branchId: string,
  reportType: InventoryReportType,
  from?: string,
  to?: string,
): Promise<ReportOutput> {
  await dbConnect();

  const { start, end } = parseDateRange(from, to);
  const [settings, categories, units, locations, suppliers, items, lots, transactions] = await Promise.all([
    Settings.findOne({ tenantId }),
    InventoryCategory.find({ tenantId, branchId }),
    InventoryUnit.find({ tenantId, branchId }),
    InventoryLocation.find({ tenantId, branchId }),
    InventorySupplier.find({ tenantId, branchId }),
    InventoryItem.find({ tenantId, branchId }),
    InventoryLot.find({ tenantId, branchId }),
    InventoryTransaction.find({
      tenantId,
      branchId,
      movementDate: { $gte: start, $lte: end },
    }).sort({ movementDate: -1 }),
  ]);

  const vendorName = settings?.businessName ?? 'Inventory Workspace';
  const generatedAt = new Date().toISOString();
  const categoryMap = new Map(categories.map((entry) => [entry._id.toString(), entry]));
  const unitMap = new Map(units.map((entry) => [entry._id.toString(), entry]));
  const locationMap = new Map(locations.map((entry) => [entry._id.toString(), entry]));
  const supplierMap = new Map(suppliers.map((entry) => [entry._id.toString(), entry]));
  const itemMap = new Map(items.map((entry) => [entry._id.toString(), entry]));

  if (reportType === 'stock-on-hand') {
    const rows = items.map((item) => {
      const openLots = lots.filter(
        (lot) =>
          lot.inventoryItemId === item._id.toString() &&
          Number(lot.quantityAvailable ?? 0) > 0 &&
          ['open', 'consumed'].includes(String(lot.status)),
      );

      return {
        item: item.itemName,
        category: categoryMap.get(item.categoryId)?.name ?? '',
        unit: unitMap.get(item.unitId)?.code ?? '',
        stock: roundValue(item.currentStock, 3),
        reorderLevel: roundValue(item.reorderLevel, 3),
        reorderQty: roundValue(item.reorderQuantity, 3),
        value: roundValue(
          openLots.reduce(
            (sum, lot) => sum + Number(lot.quantityAvailable ?? 0) * Number(lot.unitCost ?? 0),
            0,
          ),
        ),
      };
    });

    return {
      title: 'stock on hand',
      vendorName,
      generatedAt,
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'category', label: 'Category' },
        { key: 'unit', label: 'Unit' },
        { key: 'stock', label: 'Stock' },
        { key: 'reorderLevel', label: 'Reorder Level' },
        { key: 'reorderQty', label: 'Reorder Qty' },
        { key: 'value', label: 'Value' },
      ],
      rows,
      totals: {
        stock: roundValue(rows.reduce((sum, row) => sum + Number(row.stock), 0), 3),
        value: roundValue(rows.reduce((sum, row) => sum + Number(row.value), 0)),
      },
    };
  }

  if (reportType === 'low-stock-items') {
    const rows = items
      .filter((item) => item.currentStock <= item.reorderLevel)
      .map((item) => ({
        item: item.itemName,
        category: categoryMap.get(item.categoryId)?.name ?? '',
        location: locationMap.get(item.defaultLocationId)?.name ?? '',
        stock: roundValue(item.currentStock, 3),
        reorderLevel: roundValue(item.reorderLevel, 3),
        reorderQty: roundValue(item.reorderQuantity, 3),
      }));

    return {
      title: 'low stock items',
      vendorName,
      generatedAt,
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'category', label: 'Category' },
        { key: 'location', label: 'Location' },
        { key: 'stock', label: 'Stock' },
        { key: 'reorderLevel', label: 'Reorder Level' },
        { key: 'reorderQty', label: 'Reorder Qty' },
      ],
      rows,
      totals: {
        stock: roundValue(rows.reduce((sum, row) => sum + Number(row.stock), 0), 3),
      },
    };
  }

  if (reportType === 'expiry-alerts') {
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);

    const rows = lots
      .filter(
        (lot) =>
          Number(lot.quantityAvailable ?? 0) > 0 &&
          lot.expiryDate &&
          new Date(lot.expiryDate) <= soon,
      )
      .map((lot) => ({
        item: itemMap.get(lot.inventoryItemId)?.itemName ?? 'Unknown item',
        batch: lot.batchNumber || lot.lotNumber || '',
        location: locationMap.get(lot.locationId)?.name ?? '',
        expiryDate: new Date(lot.expiryDate as Date).toISOString().slice(0, 10),
        quantity: roundValue(Number(lot.quantityAvailable ?? 0), 3),
        status: new Date(lot.expiryDate as Date) < new Date() ? 'expired' : 'near-expiry',
      }))
      .sort((left, right) => left.expiryDate.localeCompare(right.expiryDate));

    return {
      title: 'expiry alerts',
      vendorName,
      generatedAt,
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'batch', label: 'Batch/Lot' },
        { key: 'location', label: 'Location' },
        { key: 'expiryDate', label: 'Expiry Date' },
        { key: 'quantity', label: 'Qty Available' },
        { key: 'status', label: 'Status' },
      ],
      rows,
      totals: {
        quantity: roundValue(rows.reduce((sum, row) => sum + Number(row.quantity), 0), 3),
      },
    };
  }

  if (reportType === 'purchase-history') {
    const rows = transactions
      .filter((transaction) =>
        ['purchase-grn', 'supplier-receipt', 'manual-in', 'correction-in'].includes(transaction.movementType),
      )
      .flatMap((transaction) =>
        transaction.lines.map((line: InventoryReportLine) => ({
          date: new Date(transaction.movementDate).toISOString().slice(0, 10),
          movement: transaction.movementNumber,
          supplier: supplierMap.get(transaction.supplierId ?? '')?.name ?? '',
          item: line.itemName,
          quantity: roundValue(line.quantity, 3),
          unitCost: roundValue(line.unitCost),
          amount: roundValue(line.totalAmount),
          invoice: line.invoiceNumber || transaction.referenceId || '',
        })),
      );

    return {
      title: 'purchase history',
      vendorName,
      generatedAt,
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'movement', label: 'Movement No' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'item', label: 'Item' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'unitCost', label: 'Unit Cost' },
        { key: 'amount', label: 'Amount' },
        { key: 'invoice', label: 'Invoice' },
      ],
      rows,
      totals: {
        quantity: roundValue(rows.reduce((sum, row) => sum + Number(row.quantity), 0), 3),
        amount: roundValue(rows.reduce((sum, row) => sum + Number(row.amount), 0)),
      },
    };
  }

  if (reportType === 'consumption-report') {
    const grouped = new Map<string, { item: string; quantity: number; amount: number }>();

    transactions
      .filter((transaction) => ['sale', 'kitchen-consumption', 'branch-issue'].includes(transaction.movementType))
      .forEach((transaction) => {
        transaction.lines.forEach((line: InventoryReportLine) => {
          const current = grouped.get(line.inventoryItemId) ?? {
            item: line.itemName,
            quantity: 0,
            amount: 0,
          };
          current.quantity += Number(line.quantity ?? 0);
          current.amount += Number(line.totalAmount ?? 0);
          grouped.set(line.inventoryItemId, current);
        });
      });

    const rows = [...grouped.values()]
      .map((row) => ({
        item: row.item,
        quantity: roundValue(row.quantity, 3),
        amount: roundValue(row.amount),
      }))
      .sort((left, right) => right.quantity - left.quantity);

    return {
      title: 'consumption report',
      vendorName,
      generatedAt,
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'quantity', label: 'Consumed Qty' },
        { key: 'amount', label: 'Consumed Value' },
      ],
      rows,
      totals: {
        quantity: roundValue(rows.reduce((sum, row) => sum + Number(row.quantity), 0), 3),
        amount: roundValue(rows.reduce((sum, row) => sum + Number(row.amount), 0)),
      },
    };
  }

  if (reportType === 'wastage-report') {
    const rows = transactions
      .filter((transaction) => ['wastage', 'spoilage', 'damage'].includes(transaction.movementType))
      .flatMap((transaction) =>
        transaction.lines.map((line: InventoryReportLine) => ({
          date: new Date(transaction.movementDate).toISOString().slice(0, 10),
          movement: transaction.movementNumber,
          type: transaction.movementType,
          item: line.itemName,
          quantity: roundValue(line.quantity, 3),
          amount: roundValue(line.totalAmount),
          reason: line.reason || transaction.reason,
        })),
      );

    return {
      title: 'wastage report',
      vendorName,
      generatedAt,
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'movement', label: 'Movement No' },
        { key: 'type', label: 'Type' },
        { key: 'item', label: 'Item' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'amount', label: 'Amount' },
        { key: 'reason', label: 'Reason' },
      ],
      rows,
      totals: {
        quantity: roundValue(rows.reduce((sum, row) => sum + Number(row.quantity), 0), 3),
        amount: roundValue(rows.reduce((sum, row) => sum + Number(row.amount), 0)),
      },
    };
  }

  if (reportType === 'stock-valuation') {
    const grouped = new Map<string, { item: string; quantity: number; value: number }>();

    lots
      .filter((lot) => Number(lot.quantityAvailable ?? 0) > 0)
      .forEach((lot) => {
        const current = grouped.get(lot.inventoryItemId) ?? {
          item: itemMap.get(lot.inventoryItemId)?.itemName ?? 'Unknown item',
          quantity: 0,
          value: 0,
        };
        current.quantity += Number(lot.quantityAvailable ?? 0);
        current.value += Number(lot.quantityAvailable ?? 0) * Number(lot.unitCost ?? 0);
        grouped.set(lot.inventoryItemId, current);
      });

    const rows = [...grouped.values()].map((row) => ({
      item: row.item,
      quantity: roundValue(row.quantity, 3),
      value: roundValue(row.value),
    }));

    return {
      title: 'stock valuation',
      vendorName,
      generatedAt,
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'quantity', label: 'Open Qty' },
        { key: 'value', label: 'Value' },
      ],
      rows,
      totals: {
        quantity: roundValue(rows.reduce((sum, row) => sum + Number(row.quantity), 0), 3),
        value: roundValue(rows.reduce((sum, row) => sum + Number(row.value), 0)),
      },
    };
  }

  if (reportType === 'supplier-purchases') {
    const grouped = new Map<string, { supplier: string; quantity: number; amount: number }>();

    transactions
      .filter((transaction) =>
        ['purchase-grn', 'supplier-receipt', 'manual-in', 'correction-in'].includes(transaction.movementType),
      )
      .forEach((transaction) => {
        const supplier = supplierMap.get(transaction.supplierId ?? '')?.name ?? 'Direct/Manual';
        const current = grouped.get(supplier) ?? { supplier, quantity: 0, amount: 0 };
        current.quantity += Number(transaction.totalQuantity ?? 0);
        current.amount += Number(transaction.totalAmount ?? 0);
        grouped.set(supplier, current);
      });

    const rows = [...grouped.values()].map((row) => ({
      supplier: row.supplier,
      quantity: roundValue(row.quantity, 3),
      amount: roundValue(row.amount),
    }));

    return {
      title: 'supplier purchases',
      vendorName,
      generatedAt,
      columns: [
        { key: 'supplier', label: 'Supplier' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'amount', label: 'Amount' },
      ],
      rows,
      totals: {
        quantity: roundValue(rows.reduce((sum, row) => sum + Number(row.quantity), 0), 3),
        amount: roundValue(rows.reduce((sum, row) => sum + Number(row.amount), 0)),
      },
    };
  }

  const groupedMovement = new Map<string, { period: string; inwardQty: number; inwardAmount: number; outwardQty: number; outwardAmount: number }>();

  transactions.forEach((transaction) => {
    const key = dayKey(new Date(transaction.movementDate));
    const current = groupedMovement.get(key) ?? {
      period: key,
      inwardQty: 0,
      inwardAmount: 0,
      outwardQty: 0,
      outwardAmount: 0,
    };

    if (transaction.direction === 'in') {
      current.inwardQty += Number(transaction.totalQuantity ?? 0);
      current.inwardAmount += Number(transaction.totalAmount ?? 0);
    } else {
      current.outwardQty += Number(transaction.totalQuantity ?? 0);
      current.outwardAmount += Number(transaction.totalAmount ?? 0);
    }

    groupedMovement.set(key, current);
  });

  const rows = [...groupedMovement.values()]
    .map((row) => ({
      period: row.period,
      inwardQty: roundValue(row.inwardQty, 3),
      inwardAmount: roundValue(row.inwardAmount),
      outwardQty: roundValue(row.outwardQty, 3),
      outwardAmount: roundValue(row.outwardAmount),
    }))
    .sort((left, right) => left.period.localeCompare(right.period));

  return {
    title: 'inventory movement',
    vendorName,
    generatedAt,
    columns: [
      { key: 'period', label: 'Date' },
      { key: 'inwardQty', label: 'Inward Qty' },
      { key: 'inwardAmount', label: 'Inward Amount' },
      { key: 'outwardQty', label: 'Outward Qty' },
      { key: 'outwardAmount', label: 'Outward Amount' },
    ],
    rows,
    totals: {
      inwardQty: roundValue(rows.reduce((sum, row) => sum + Number(row.inwardQty), 0), 3),
      inwardAmount: roundValue(rows.reduce((sum, row) => sum + Number(row.inwardAmount), 0)),
      outwardQty: roundValue(rows.reduce((sum, row) => sum + Number(row.outwardQty), 0), 3),
      outwardAmount: roundValue(rows.reduce((sum, row) => sum + Number(row.outwardAmount), 0)),
    },
  };
}
