import mongoose from 'mongoose';
import Product from '@/models/Product';
import InventoryAuditLog from '@/models/InventoryAuditLog';
import InventoryCategory from '@/models/InventoryCategory';
import InventoryItem from '@/models/InventoryItem';
import InventoryLocation from '@/models/InventoryLocation';
import InventoryLot from '@/models/InventoryLot';
import InventoryRecipe from '@/models/InventoryRecipe';
import InventorySupplier from '@/models/InventorySupplier';
import InventoryTransaction from '@/models/InventoryTransaction';
import InventoryUnit from '@/models/InventoryUnit';
import dbConnect from '@/lib/mongodb';
import { getInventoryPermissions } from '@/lib/inventory-permissions';
import {
  serializeInventoryAuditLog,
  serializeInventoryCategory,
  serializeInventoryItem,
  serializeInventoryLocation,
  serializeInventoryRecipe,
  serializeInventorySupplier,
  serializeInventoryTransaction,
  serializeInventoryUnit,
} from '@/lib/inventory-serializers';
import { serializeProduct } from '@/lib/serializers';
import type { TenantSessionUser } from '@/lib/server-auth';
import type {
  InventoryAuditAction,
  InventoryEntityType,
  InventoryMovementType,
} from '@/types/inventory';

type InventoryUserContext = Pick<
  TenantSessionUser,
  'id' | 'tenantId' | 'businessId' | 'branchId' | 'role' | 'name'
>;

type InventoryMasterResource = 'category' | 'unit' | 'supplier' | 'location' | 'item';

type InventoryMasterInput = Record<string, unknown>;

type InventoryTransactionLineInput = {
  inventoryItemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  lotNumber?: string;
  expiryDate?: string;
  purchaseDate?: string;
  invoiceNumber?: string;
  reason?: string;
  productId?: string;
  productName?: string;
};

type InventoryTransactionInput = {
  movementDate?: string;
  direction: 'in' | 'out';
  movementType: InventoryMovementType;
  reason: string;
  notes?: string;
  supplierId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  referenceType?: string;
  referenceId?: string;
  sourceModule?: 'inventory' | 'billing' | 'purchase' | 'system';
  lines: InventoryTransactionLineInput[];
};

type InventoryServiceTransactionLine = {
  inventoryItemId: string;
  itemName: string;
  unitId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
  batchNumber?: string;
  lotNumber?: string;
  expiryDate?: unknown;
  purchaseDate?: unknown;
  invoiceNumber?: string;
  reason?: string;
  productId?: string;
  productName?: string;
  allocations?: Array<{
    lotId: string;
    batchNumber?: string;
    quantity: number;
    unitCost: number;
    expiryDate?: unknown;
  }>;
};

type InventoryServiceRecipeLine = {
  inventoryItemId: string;
  quantity: number;
  wastagePercent?: number;
  notes?: string;
};

type InventoryRecipeInput = {
  productId: string;
  yieldQuantity: number;
  notes?: string;
  isActive?: boolean;
  lines: Array<{
    inventoryItemId: string;
    quantity: number;
    wastagePercent?: number;
    notes?: string;
  }>;
};

const masterModels = {
  category: InventoryCategory,
  unit: InventoryUnit,
  supplier: InventorySupplier,
  location: InventoryLocation,
  item: InventoryItem,
} as const;

function scopeFilter(user: InventoryUserContext) {
  return {
    tenantId: user.tenantId,
    businessId: user.businessId,
    branchId: user.branchId,
  };
}

function createScope(user: InventoryUserContext) {
  return {
    tenantId: user.tenantId,
    businessId: user.businessId,
    branchId: user.branchId,
    createdBy: user.id,
  };
}

function roundInventoryValue(value: number, precision = 3) {
  return Number(Number(value).toFixed(precision));
}

function toDateOrUndefined(value?: string | Date | null) {
  if (!value) {
    return undefined;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function buildItemCode(name: string) {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16);

  return `${base || 'ITEM'}-${Date.now().toString().slice(-5)}`;
}

function buildMovementNumber(direction: 'in' | 'out', movementType: InventoryMovementType) {
  const prefix = direction === 'in' ? 'IN' : 'OUT';
  const typeCode = movementType
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X');
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.floor(Math.random() * 9000 + 1000);

  return `INV-${prefix}-${typeCode}-${stamp}-${random}`;
}

function mergeLocationBalance(
  balances: Array<{ locationId: string; quantity: number }>,
  locationId: string,
  delta: number,
) {
  const next = balances.map((balance) => ({ ...balance }));
  const existing = next.find((entry) => entry.locationId === locationId);

  if (existing) {
    existing.quantity = roundInventoryValue(existing.quantity + delta);
  } else {
    next.push({ locationId, quantity: roundInventoryValue(delta) });
  }

  return next.filter((entry) => Math.abs(entry.quantity) > 0.0001);
}

async function createInventoryAudit(
  user: InventoryUserContext,
  input: {
    entityType: InventoryEntityType;
    entityId: string;
    action: InventoryAuditAction;
    description: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    referenceId?: string;
  },
) {
  await InventoryAuditLog.create({
    ...createScope(user),
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    description: input.description,
    before: input.before,
    after: input.after,
    referenceId: input.referenceId,
  });
}

async function ensurePrimaryLocation(user: InventoryUserContext) {
  let location = await InventoryLocation.findOne({
    ...scopeFilter(user),
    isPrimary: true,
    isActive: true,
  });

  if (location) {
    return location;
  }

  location = await InventoryLocation.create({
    ...createScope(user),
    name: 'Main Store',
    code: 'MAIN',
    description: 'Default stock room',
    isPrimary: true,
    isActive: true,
  });

  await createInventoryAudit(user, {
    entityType: 'location',
    entityId: location._id.toString(),
    action: 'create',
    description: 'Default primary inventory location created automatically.',
    after: location.toObject(),
  });

  return location;
}

async function ensureDefaultUnits(user: InventoryUserContext) {
  const existing = await InventoryUnit.find({
    ...scopeFilter(user),
    isActive: true,
  }).limit(1);

  if (existing.length > 0) {
    return;
  }

  const defaults = [
    { name: 'Kilogram', code: 'KG', precision: 3 },
    { name: 'Litre', code: 'LTR', precision: 3 },
    { name: 'Piece', code: 'PCS', precision: 0 },
  ];

  for (const unit of defaults) {
    const created = await InventoryUnit.create({
      ...createScope(user),
      ...unit,
      isActive: true,
    });

    await createInventoryAudit(user, {
      entityType: 'unit',
      entityId: created._id.toString(),
      action: 'create',
      description: `Default unit ${unit.code} created automatically.`,
      after: created.toObject(),
    });
  }
}

async function adjustItemStock(
  item: {
    _id: { toString(): string };
    currentStock: number;
    stockByLocation: Array<{ locationId: string; quantity: number }>;
    averageCost: number;
    lastPurchaseCost: number;
    lastPurchaseDate?: Date;
    save(): Promise<unknown>;
  },
  input: {
    locationId: string;
    deltaQuantity: number;
    direction: 'in' | 'out';
    unitCost: number;
    movementDate?: Date;
  },
) {
  item.currentStock = roundInventoryValue(item.currentStock + input.deltaQuantity);
  item.stockByLocation = mergeLocationBalance(item.stockByLocation, input.locationId, input.deltaQuantity);

  if (input.direction === 'in' && input.deltaQuantity > 0) {
    const previousQuantity = roundInventoryValue(item.currentStock - input.deltaQuantity);

    if (item.currentStock > 0) {
      const weightedCost =
        previousQuantity <= 0
          ? input.unitCost
          : (previousQuantity * item.averageCost + input.deltaQuantity * input.unitCost) /
            item.currentStock;
      item.averageCost = roundInventoryValue(weightedCost);
    }

    item.lastPurchaseCost = roundInventoryValue(input.unitCost);
    item.lastPurchaseDate = input.movementDate ?? new Date();
  }

  await item.save();
}

async function allocateLotsForOutward(
  user: InventoryUserContext,
  item: {
    _id: { toString(): string };
    currentStock: number;
    allowNegativeStock: boolean;
    averageCost: number;
  },
  line: InventoryTransactionLineInput,
) {
  const lotFilter: Record<string, unknown> = {
    ...scopeFilter(user),
    inventoryItemId: item._id.toString(),
    locationId: line.locationId,
    status: 'open',
    quantityAvailable: { $gt: 0 },
  };

  if (line.batchNumber) {
    lotFilter.batchNumber = line.batchNumber;
  }

  if (line.lotNumber) {
    lotFilter.lotNumber = line.lotNumber;
  }

  const lots = await InventoryLot.find(lotFilter).sort({
    expiryDate: 1,
    purchaseDate: 1,
    createdAt: 1,
  });

  let remaining = roundInventoryValue(line.quantity);
  const allocations: Array<{
    lotId: string;
    batchNumber?: string;
    quantity: number;
    unitCost: number;
    expiryDate?: Date;
  }> = [];
  let totalAmount = 0;

  for (const lot of lots) {
    if (remaining <= 0) {
      break;
    }

    const available = roundInventoryValue(lot.quantityAvailable);
    if (available <= 0) {
      continue;
    }

    const consumed = Math.min(available, remaining);
    lot.quantityAvailable = roundInventoryValue(available - consumed);
    lot.status = lot.quantityAvailable > 0 ? 'open' : 'consumed';
    await lot.save();

    allocations.push({
      lotId: lot._id.toString(),
      batchNumber: lot.batchNumber,
      quantity: consumed,
      unitCost: roundInventoryValue(lot.unitCost),
      expiryDate: lot.expiryDate,
    });

    totalAmount += consumed * lot.unitCost;
    remaining = roundInventoryValue(remaining - consumed);
  }

  if (remaining > 0) {
    if (!item.allowNegativeStock) {
      throw new Error(`Insufficient stock lots for this movement. Remaining quantity ${remaining}.`);
    }

    const fallbackCost = line.unitCost || item.averageCost || 0;
    allocations.push({
      lotId: 'unallocated',
      quantity: remaining,
      unitCost: roundInventoryValue(fallbackCost),
    });
    totalAmount += remaining * fallbackCost;
  }

  return {
    allocations,
    totalAmount: roundInventoryValue(totalAmount, 2),
  };
}

function buildMasterSerializer(resource: InventoryMasterResource) {
  if (resource === 'category') {
    return serializeInventoryCategory;
  }

  if (resource === 'unit') {
    return serializeInventoryUnit;
  }

  if (resource === 'supplier') {
    return serializeInventorySupplier;
  }

  if (resource === 'location') {
    return serializeInventoryLocation;
  }

  return serializeInventoryItem;
}

export async function ensureInventorySetup(user: InventoryUserContext) {
  await dbConnect();
  await Promise.all([ensurePrimaryLocation(user), ensureDefaultUnits(user)]);
}

export async function getInventoryMasters(user: InventoryUserContext) {
  await ensureInventorySetup(user);

  const [categories, units, suppliers, locations, items] = await Promise.all([
    InventoryCategory.find(scopeFilter(user)).sort({ name: 1 }),
    InventoryUnit.find(scopeFilter(user)).sort({ name: 1 }),
    InventorySupplier.find(scopeFilter(user)).sort({ name: 1 }),
    InventoryLocation.find(scopeFilter(user)).sort({ isPrimary: -1, name: 1 }),
    InventoryItem.find(scopeFilter(user)).sort({ itemName: 1 }),
  ]);

  return {
    categories: categories.map(serializeInventoryCategory),
    units: units.map(serializeInventoryUnit),
    suppliers: suppliers.map(serializeInventorySupplier),
    locations: locations.map(serializeInventoryLocation),
    items: items.map(serializeInventoryItem),
  };
}

export async function createInventoryMaster(
  user: InventoryUserContext,
  resource: InventoryMasterResource,
  input: InventoryMasterInput,
) {
  await ensureInventorySetup(user);
  const model = masterModels[resource];
  const serializer = buildMasterSerializer(resource);

  if (resource === 'location' && input.isPrimary === true) {
    await InventoryLocation.updateMany(scopeFilter(user), { isPrimary: false });
  }

  const payload =
    resource === 'item'
      ? {
          ...input,
          itemCode:
            typeof input.itemCode === 'string' && input.itemCode.trim()
              ? input.itemCode.trim().toUpperCase()
              : buildItemCode(String(input.itemName ?? 'ITEM')),
        }
      : resource === 'unit'
        ? { ...input, code: String(input.code ?? '').trim().toUpperCase() }
        : resource === 'location'
          ? { ...input, code: String(input.code ?? '').trim().toUpperCase() }
          : input;

  const created = await model.create({
    ...createScope(user),
    ...payload,
  });

  await createInventoryAudit(user, {
    entityType: resource,
    entityId: created._id.toString(),
    action: 'create',
    description: `Inventory ${resource} created.`,
    after: created.toObject(),
  });

  return serializer(created.toObject());
}

export async function updateInventoryMaster(
  user: InventoryUserContext,
  resource: InventoryMasterResource,
  id: string,
  input: InventoryMasterInput,
) {
  await ensureInventorySetup(user);
  const model = masterModels[resource];
  const serializer = buildMasterSerializer(resource);
  const existing = await model.findOne({
    ...scopeFilter(user),
    _id: id,
  });

  if (!existing) {
    throw new Error('Master record not found.');
  }

  const before = existing.toObject();

  if (resource === 'location' && input.isPrimary === true) {
    await InventoryLocation.updateMany(
      {
        ...scopeFilter(user),
        _id: { $ne: id },
      },
      { isPrimary: false },
    );
  }

  Object.entries(input).forEach(([key, value]) => {
    if (resource === 'unit' && key === 'code' && typeof value === 'string') {
      existing.set(key, value.trim().toUpperCase());
      return;
    }

    if (resource === 'location' && key === 'code' && typeof value === 'string') {
      existing.set(key, value.trim().toUpperCase());
      return;
    }

    if (resource === 'item' && key === 'itemCode' && typeof value === 'string') {
      existing.set(key, value.trim() ? value.trim().toUpperCase() : buildItemCode(String(existing.get('itemName'))));
      return;
    }

    existing.set(key, value);
  });

  await existing.save();

  await createInventoryAudit(user, {
    entityType: resource,
    entityId: existing._id.toString(),
    action: 'update',
    description: `Inventory ${resource} updated.`,
    before,
    after: existing.toObject(),
  });

  return serializer(existing.toObject());
}

export async function deleteInventoryMaster(
  user: InventoryUserContext,
  resource: InventoryMasterResource,
  id: string,
) {
  await ensureInventorySetup(user);
  const model = masterModels[resource];
  const existing = await model.findOne({
    ...scopeFilter(user),
    _id: id,
  });

  if (!existing) {
    throw new Error('Master record not found.');
  }

  const before = existing.toObject();

  if (resource === 'item' && Number(existing.get('currentStock') ?? 0) > 0) {
    throw new Error('Cannot deactivate an item while stock is still available.');
  }

  existing.set('isActive', false);
  await existing.save();

  await createInventoryAudit(user, {
    entityType: resource,
    entityId: existing._id.toString(),
    action: 'delete',
    description: `Inventory ${resource} deactivated.`,
    before,
    after: existing.toObject(),
  });

  return { success: true };
}

export async function createInventoryTransaction(
  user: InventoryUserContext,
  input: InventoryTransactionInput,
) {
  await ensureInventorySetup(user);

  const transactionObjectId = new mongoose.Types.ObjectId();
  const movementDate = toDateOrUndefined(input.movementDate) ?? new Date();
  const itemIds = [...new Set(input.lines.map((line) => line.inventoryItemId))];
  const locationIds = [...new Set(input.lines.map((line) => line.locationId))];
  const [items, locations] = await Promise.all([
    InventoryItem.find({
      ...scopeFilter(user),
      _id: { $in: itemIds },
      isActive: true,
    }),
    InventoryLocation.find({
      ...scopeFilter(user),
      _id: { $in: locationIds },
      isActive: true,
    }),
  ]);

  const itemMap = new Map(items.map((item) => [item._id.toString(), item]));
  const locationMap = new Map(locations.map((location) => [location._id.toString(), location]));
  const preparedLines = [];

  for (const line of input.lines) {
    const item = itemMap.get(line.inventoryItemId);

    if (!item) {
      throw new Error('One or more inventory items are missing or inactive.');
    }

    if (!locationMap.has(line.locationId)) {
      throw new Error('One or more inventory locations are missing or inactive.');
    }

    const quantity = roundInventoryValue(line.quantity);
    if (input.direction === 'out' && !item.allowNegativeStock && item.currentStock < quantity) {
      throw new Error(`Insufficient stock for ${item.itemName}.`);
    }

    if (input.direction === 'in') {
      const unitCost = roundInventoryValue(line.unitCost || item.lastPurchaseCost || item.averageCost || 0, 2);
      const totalAmount = roundInventoryValue(quantity * unitCost, 2);
      const lotNumber =
        line.lotNumber?.trim() || line.batchNumber?.trim() || `${item.itemCode}-${Date.now().toString().slice(-6)}`;

      await adjustItemStock(item, {
        locationId: line.locationId,
        deltaQuantity: quantity,
        direction: 'in',
        unitCost,
        movementDate,
      });

      const createdLot = await InventoryLot.create({
        _id: new mongoose.Types.ObjectId(),
        ...createScope(user),
        inventoryItemId: item._id.toString(),
        locationId: line.locationId,
        supplierId: input.supplierId || item.defaultSupplierId,
        transactionId: transactionObjectId.toString(),
        batchNumber: line.batchNumber?.trim() || undefined,
        lotNumber,
        expiryDate: toDateOrUndefined(line.expiryDate),
        purchaseDate: toDateOrUndefined(line.purchaseDate) ?? movementDate,
        invoiceNumber: line.invoiceNumber?.trim() || undefined,
        unitCost,
        totalAmount,
        quantityReceived: quantity,
        quantityAvailable: quantity,
        status: 'open',
      });

      preparedLines.push({
        inventoryItemId: item._id.toString(),
        itemName: item.itemName,
        unitId: item.unitId,
        locationId: line.locationId,
        quantity,
        unitCost,
        totalAmount,
        batchNumber: line.batchNumber?.trim() || undefined,
        lotNumber,
        expiryDate: toDateOrUndefined(line.expiryDate),
        purchaseDate: toDateOrUndefined(line.purchaseDate) ?? movementDate,
        invoiceNumber: line.invoiceNumber?.trim() || undefined,
        reason: line.reason?.trim() || undefined,
        productId: line.productId?.trim() || undefined,
        productName: line.productName?.trim() || undefined,
        allocations: [
          {
            lotId: createdLot._id.toString(),
            batchNumber: createdLot.batchNumber,
            quantity,
            unitCost,
            expiryDate: createdLot.expiryDate,
          },
        ],
      });

      continue;
    }

    const allocation = await allocateLotsForOutward(user, item, line);
    const unitCost =
      quantity > 0 ? roundInventoryValue(allocation.totalAmount / quantity, 2) : roundInventoryValue(line.unitCost, 2);

    await adjustItemStock(item, {
      locationId: line.locationId,
      deltaQuantity: -quantity,
      direction: 'out',
      unitCost,
    });

    preparedLines.push({
      inventoryItemId: item._id.toString(),
      itemName: item.itemName,
      unitId: item.unitId,
      locationId: line.locationId,
      quantity,
      unitCost,
      totalAmount: allocation.totalAmount,
      batchNumber: line.batchNumber?.trim() || undefined,
      lotNumber: line.lotNumber?.trim() || undefined,
      expiryDate: toDateOrUndefined(line.expiryDate),
      purchaseDate: toDateOrUndefined(line.purchaseDate),
      invoiceNumber: line.invoiceNumber?.trim() || undefined,
      reason: line.reason?.trim() || undefined,
      productId: line.productId?.trim() || undefined,
      productName: line.productName?.trim() || undefined,
      allocations: allocation.allocations,
    });
  }

  const totalQuantity = roundInventoryValue(
    preparedLines.reduce((sum, line) => sum + line.quantity, 0),
  );
  const totalAmount = roundInventoryValue(
    preparedLines.reduce((sum, line) => sum + line.totalAmount, 0),
    2,
  );

  const transaction = await InventoryTransaction.create({
    _id: transactionObjectId,
    ...createScope(user),
    movementNumber: buildMovementNumber(input.direction, input.movementType),
    movementDate,
    direction: input.direction,
    movementType: input.movementType,
    status: 'posted',
    reason: input.reason.trim(),
    notes: input.notes?.trim() || undefined,
    sourceModule: input.sourceModule || 'inventory',
    supplierId: input.supplierId || undefined,
    fromLocationId: input.fromLocationId || undefined,
    toLocationId: input.toLocationId || undefined,
    referenceType: input.referenceType || undefined,
    referenceId: input.referenceId || undefined,
    approvedBy: user.id,
    approvedAt: new Date(),
    totalQuantity,
    totalAmount,
    lines: preparedLines,
  });

  await createInventoryAudit(user, {
    entityType: 'transaction',
    entityId: transaction._id.toString(),
    action: 'post',
    description: `Inventory ${input.direction === 'in' ? 'inward' : 'outward'} transaction posted.`,
    after: transaction.toObject(),
  });

  return serializeInventoryTransaction(transaction.toObject());
}

export async function cancelInventoryTransaction(
  user: InventoryUserContext,
  id: string,
  reason: string,
) {
  await ensureInventorySetup(user);
  const transaction = await InventoryTransaction.findOne({
    ...scopeFilter(user),
    _id: id,
  });

  if (!transaction) {
    throw new Error('Inventory transaction not found.');
  }

  if (transaction.status === 'cancelled') {
    throw new Error('This transaction is already cancelled.');
  }

  const items = await InventoryItem.find({
    ...scopeFilter(user),
    _id: { $in: transaction.lines.map((line: InventoryServiceTransactionLine) => line.inventoryItemId) },
  });
  const itemMap = new Map(items.map((item) => [item._id.toString(), item]));
  const reversalId = new mongoose.Types.ObjectId();
  const reversalLines = [];

  for (const line of transaction.lines) {
    const item = itemMap.get(line.inventoryItemId);

    if (!item) {
      throw new Error('Unable to reverse because one or more inventory items no longer exist.');
    }

    if (transaction.direction === 'in') {
      const lots = await InventoryLot.find({
        ...scopeFilter(user),
        transactionId: transaction._id.toString(),
        inventoryItemId: line.inventoryItemId,
        locationId: line.locationId,
        status: { $in: ['open', 'consumed'] },
      }).sort({ createdAt: -1 });

      const availableToReverse = lots.reduce((sum, lot) => sum + Number(lot.quantityAvailable ?? 0), 0);
      if (availableToReverse + 0.0001 < line.quantity) {
        throw new Error(`Cannot cancel ${transaction.movementNumber} because stock from ${line.itemName} is already consumed.`);
      }

      let remaining = roundInventoryValue(line.quantity);
      const reversalAllocations = [];

      for (const lot of lots) {
        if (remaining <= 0) {
          break;
        }

        const consumable = Math.min(Number(lot.quantityAvailable ?? 0), remaining);
        if (consumable <= 0) {
          continue;
        }

        lot.quantityAvailable = roundInventoryValue(Number(lot.quantityAvailable ?? 0) - consumable);
        lot.status = lot.quantityAvailable > 0 ? 'open' : 'cancelled';
        await lot.save();

        reversalAllocations.push({
          lotId: lot._id.toString(),
          batchNumber: lot.batchNumber,
          quantity: consumable,
          unitCost: line.unitCost,
          expiryDate: lot.expiryDate,
        });

        remaining = roundInventoryValue(remaining - consumable);
      }

      await adjustItemStock(item, {
        locationId: line.locationId,
        deltaQuantity: -line.quantity,
        direction: 'out',
        unitCost: line.unitCost,
      });

      reversalLines.push({
        ...line.toObject(),
        allocations: reversalAllocations,
      });
      continue;
    }

    for (const allocation of line.allocations ?? []) {
      if (allocation.lotId === 'unallocated') {
        await InventoryLot.create({
          _id: new mongoose.Types.ObjectId(),
          ...createScope(user),
          inventoryItemId: line.inventoryItemId,
          locationId: line.locationId,
          transactionId: reversalId.toString(),
          lotNumber: `REV-${Date.now().toString().slice(-6)}`,
          unitCost: allocation.unitCost,
          totalAmount: roundInventoryValue(allocation.quantity * allocation.unitCost, 2),
          quantityReceived: allocation.quantity,
          quantityAvailable: allocation.quantity,
          status: 'open',
        });

        continue;
      }

      const lot = await InventoryLot.findOne({
        ...scopeFilter(user),
        _id: allocation.lotId,
      });

      if (!lot) {
        continue;
      }

      lot.quantityAvailable = roundInventoryValue(Number(lot.quantityAvailable ?? 0) + allocation.quantity);
      lot.status = 'open';
      await lot.save();
    }

    await adjustItemStock(item, {
      locationId: line.locationId,
      deltaQuantity: line.quantity,
      direction: 'in',
      unitCost: line.unitCost,
    });

    reversalLines.push(line.toObject());
  }

  const reversal = await InventoryTransaction.create({
    _id: reversalId,
    ...createScope(user),
    movementNumber: buildMovementNumber(
      transaction.direction === 'in' ? 'out' : 'in',
      'reversal',
    ),
    movementDate: new Date(),
    direction: transaction.direction === 'in' ? 'out' : 'in',
    movementType: 'reversal',
    status: 'posted',
    reason: reason.trim(),
    notes: `Reversal for ${transaction.movementNumber}`,
    sourceModule: 'inventory',
    supplierId: transaction.supplierId,
    fromLocationId: transaction.fromLocationId,
    toLocationId: transaction.toLocationId,
    referenceType: 'transaction',
    referenceId: transaction._id.toString(),
    relatedTransactionId: transaction._id.toString(),
    approvedBy: user.id,
    approvedAt: new Date(),
    totalQuantity: transaction.totalQuantity,
    totalAmount: transaction.totalAmount,
    lines: reversalLines,
  });

  const before = transaction.toObject();
  transaction.status = 'cancelled';
  transaction.cancelledBy = user.id;
  transaction.cancelledAt = new Date();
  transaction.cancelReason = reason.trim();
  transaction.relatedTransactionId = reversal._id.toString();
  await transaction.save();

  await createInventoryAudit(user, {
    entityType: 'transaction',
    entityId: transaction._id.toString(),
    action: 'cancel',
    description: `Inventory transaction ${transaction.movementNumber} cancelled.`,
    before,
    after: transaction.toObject(),
    referenceId: reversal._id.toString(),
  });

  await createInventoryAudit(user, {
    entityType: 'transaction',
    entityId: reversal._id.toString(),
    action: 'reverse',
    description: `Reversal transaction ${reversal.movementNumber} posted.`,
    after: reversal.toObject(),
    referenceId: transaction._id.toString(),
  });

  return {
    cancelled: serializeInventoryTransaction(transaction.toObject()),
    reversal: serializeInventoryTransaction(reversal.toObject()),
  };
}

export async function replaceInventoryTransaction(
  user: InventoryUserContext,
  id: string,
  reason: string,
  replacement: InventoryTransactionInput,
) {
  const cancelled = await cancelInventoryTransaction(user, id, reason);
  const created = await createInventoryTransaction(user, replacement);

  await createInventoryAudit(user, {
    entityType: 'transaction',
    entityId: created._id,
    action: 'replace',
    description: `Replacement transaction posted for ${id}.`,
    referenceId: id,
  });

  return {
    cancelled,
    replacement: created,
  };
}

export async function getInventoryTransactions(user: InventoryUserContext, limit = 100) {
  await ensureInventorySetup(user);

  const transactions = await InventoryTransaction.find(scopeFilter(user))
    .sort({ movementDate: -1, createdAt: -1 })
    .limit(limit);

  return transactions.map((transaction) => serializeInventoryTransaction(transaction.toObject()));
}

export async function upsertInventoryRecipe(user: InventoryUserContext, input: InventoryRecipeInput) {
  await ensureInventorySetup(user);
  const product = await Product.findOne({
    _id: input.productId,
    tenantId: user.tenantId,
    activeStatus: true,
  });

  if (!product) {
    throw new Error('Menu item not found.');
  }

  const inventoryItemIds = [...new Set(input.lines.map((line: InventoryServiceRecipeLine) => line.inventoryItemId))];
  const items = await InventoryItem.find({
    ...scopeFilter(user),
    _id: { $in: inventoryItemIds },
    isActive: true,
  });

  if (items.length !== inventoryItemIds.length) {
    throw new Error('One or more inventory items in the recipe are missing or inactive.');
  }

  const existing = await InventoryRecipe.findOne({
    ...scopeFilter(user),
    productId: input.productId,
  });

  if (existing) {
    const before = existing.toObject();
    existing.yieldQuantity = input.yieldQuantity;
    existing.notes = input.notes?.trim() || undefined;
    existing.isActive = input.isActive ?? true;
    existing.lines = input.lines.map((line: InventoryServiceRecipeLine) => ({
      inventoryItemId: line.inventoryItemId,
      quantity: roundInventoryValue(line.quantity),
      wastagePercent: roundInventoryValue(line.wastagePercent ?? 0, 2),
      notes: line.notes?.trim() || undefined,
    }));
    await existing.save();

    await createInventoryAudit(user, {
      entityType: 'recipe',
      entityId: existing._id.toString(),
      action: 'update',
      description: `Recipe updated for ${product.productName}.`,
      before,
      after: existing.toObject(),
    });

    return serializeInventoryRecipe(existing.toObject());
  }

  const created = await InventoryRecipe.create({
    ...createScope(user),
    productId: input.productId,
    yieldQuantity: input.yieldQuantity,
    notes: input.notes?.trim() || undefined,
    isActive: input.isActive ?? true,
    lines: input.lines.map((line: InventoryServiceRecipeLine) => ({
      inventoryItemId: line.inventoryItemId,
      quantity: roundInventoryValue(line.quantity),
      wastagePercent: roundInventoryValue(line.wastagePercent ?? 0, 2),
      notes: line.notes?.trim() || undefined,
    })),
  });

  await createInventoryAudit(user, {
    entityType: 'recipe',
    entityId: created._id.toString(),
    action: 'create',
    description: `Recipe created for ${product.productName}.`,
    after: created.toObject(),
  });

  return serializeInventoryRecipe(created.toObject());
}

export async function deleteInventoryRecipe(user: InventoryUserContext, productId: string) {
  await ensureInventorySetup(user);
  const recipe = await InventoryRecipe.findOne({
    ...scopeFilter(user),
    productId,
  });

  if (!recipe) {
    throw new Error('Recipe not found.');
  }

  const before = recipe.toObject();
  await recipe.deleteOne();

  await createInventoryAudit(user, {
    entityType: 'recipe',
    entityId: recipe._id.toString(),
    action: 'delete',
    description: 'Recipe deleted.',
    before,
  });

  return { success: true };
}

export async function getInventoryRecipes(user: InventoryUserContext) {
  await ensureInventorySetup(user);
  const [recipes, products, items, units] = await Promise.all([
    InventoryRecipe.find(scopeFilter(user)).sort({ updatedAt: -1 }),
    Product.find({ tenantId: user.tenantId, activeStatus: true }).sort({ productName: 1 }),
    InventoryItem.find(scopeFilter(user)).sort({ itemName: 1 }),
    InventoryUnit.find(scopeFilter(user)).sort({ name: 1 }),
  ]);

  const productMap = new Map(products.map((product) => [product._id.toString(), serializeProduct(product.toObject())]));
  const itemMap = new Map(items.map((item) => [item._id.toString(), serializeInventoryItem(item.toObject())]));
  const unitMap = new Map(units.map((unit) => [unit._id.toString(), serializeInventoryUnit(unit.toObject())]));

  return recipes.map((recipeDoc) => {
    const recipe = serializeInventoryRecipe(recipeDoc.toObject());
    const enrichedLines = recipe.lines.map((line: InventoryServiceRecipeLine) => {
      const inventoryItem = itemMap.get(line.inventoryItemId);
      const unit = inventoryItem ? unitMap.get(inventoryItem.unitId) : undefined;
      const baseQuantity = line.quantity * (1 + (line.wastagePercent ?? 0) / 100);
      const lineCost = roundInventoryValue(baseQuantity * (inventoryItem?.averageCost ?? 0), 2);

      return {
        ...line,
        itemName: inventoryItem?.itemName ?? 'Unknown item',
        itemCode: inventoryItem?.itemCode ?? '',
        unitName: unit?.name ?? '',
        lineCost,
      };
    });

    return {
      ...recipe,
      productName: productMap.get(recipe.productId)?.productName ?? 'Unknown product',
      productCategory: productMap.get(recipe.productId)?.category ?? '',
      estimatedCost: roundInventoryValue(
        enrichedLines.reduce((sum, line) => sum + line.lineCost, 0),
        2,
      ),
      lines: enrichedLines,
    };
  });
}

export async function getRecentInventoryAudits(user: InventoryUserContext, limit = 30) {
  await ensureInventorySetup(user);
  const audits = await InventoryAuditLog.find(scopeFilter(user)).sort({ createdAt: -1 }).limit(limit);
  return audits.map((audit) => serializeInventoryAuditLog(audit.toObject()));
}

export async function getInventoryBootstrap(user: InventoryUserContext) {
  await ensureInventorySetup(user);

  const [masters, recipes, transactions, audits, products, lots] = await Promise.all([
    getInventoryMasters(user),
    getInventoryRecipes(user),
    getInventoryTransactions(user, 50),
    getRecentInventoryAudits(user, 20),
    Product.find({ tenantId: user.tenantId, activeStatus: true }).sort({ productName: 1 }),
    InventoryLot.find({
      ...scopeFilter(user),
      quantityAvailable: { $gt: 0 },
      status: { $in: ['open', 'consumed'] },
    }),
  ]);

  const categoryMap = new Map(masters.categories.map((entry) => [entry.id, entry]));
  const unitMap = new Map(masters.units.map((entry) => [entry.id, entry]));
  const supplierMap = new Map(masters.suppliers.map((entry) => [entry.id, entry]));
  const locationMap = new Map(masters.locations.map((entry) => [entry.id, entry]));

  const today = new Date();
  const nearExpiryDate = new Date();
  nearExpiryDate.setDate(nearExpiryDate.getDate() + 7);

  const items = masters.items.map((item) => ({
    ...item,
    categoryName: categoryMap.get(item.categoryId)?.name ?? '',
    unitName: unitMap.get(item.unitId)?.name ?? '',
    defaultLocationName: locationMap.get(item.defaultLocationId)?.name ?? '',
    defaultSupplierName: supplierMap.get(item.defaultSupplierId)?.name ?? '',
  }));

  const lotValue = lots.reduce(
    (sum, lot) => sum + Number(lot.quantityAvailable ?? 0) * Number(lot.unitCost ?? 0),
    0,
  );

  const expiringLots = lots
    .filter((lot) => lot.expiryDate && new Date(lot.expiryDate) >= today && new Date(lot.expiryDate) <= nearExpiryDate)
    .map((lot) => ({
      id: lot._id.toString(),
      inventoryItemId: lot.inventoryItemId,
      itemName: items.find((item) => item.id === lot.inventoryItemId)?.itemName ?? 'Unknown item',
      batchNumber: lot.batchNumber ?? '',
      lotNumber: lot.lotNumber ?? '',
      expiryDate: lot.expiryDate,
      quantityAvailable: lot.quantityAvailable,
      locationName: locationMap.get(lot.locationId)?.name ?? '',
    }));

  const expiredLots = lots
    .filter((lot) => lot.expiryDate && new Date(lot.expiryDate) < today)
    .map((lot) => ({
      id: lot._id.toString(),
      inventoryItemId: lot.inventoryItemId,
      itemName: items.find((item) => item.id === lot.inventoryItemId)?.itemName ?? 'Unknown item',
      batchNumber: lot.batchNumber ?? '',
      lotNumber: lot.lotNumber ?? '',
      expiryDate: lot.expiryDate,
      quantityAvailable: lot.quantityAvailable,
      locationName: locationMap.get(lot.locationId)?.name ?? '',
    }));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthTransactions = transactions.filter(
    (transaction) => new Date((transaction.movementDate as string | Date | undefined) ?? new Date()) >= monthStart,
  );

  const movement = monthTransactions.reduce(
    (summary, transaction) => {
      if (transaction.direction === 'in') {
        summary.inwardQuantity += transaction.totalQuantity;
        summary.inwardAmount += transaction.totalAmount;
      } else {
        summary.outwardQuantity += transaction.totalQuantity;
        summary.outwardAmount += transaction.totalAmount;
      }

      return summary;
    },
    { inwardQuantity: 0, inwardAmount: 0, outwardQuantity: 0, outwardAmount: 0 },
  );

  const consumptionMap = new Map<string, { itemName: string; quantity: number; amount: number }>();
  transactions
    .filter((transaction) =>
      ['sale', 'kitchen-consumption', 'wastage', 'spoilage', 'damage'].includes(transaction.movementType),
    )
    .forEach((transaction) => {
      transaction.lines.forEach((line: InventoryServiceTransactionLine) => {
        const current = consumptionMap.get(line.inventoryItemId) ?? {
          itemName: line.itemName,
          quantity: 0,
          amount: 0,
        };
        current.quantity += line.quantity;
        current.amount += line.totalAmount;
        consumptionMap.set(line.inventoryItemId, current);
      });
    });

  const topConsumption = [...consumptionMap.entries()]
    .map(([inventoryItemId, entry]) => ({
      inventoryItemId,
      itemName: entry.itemName,
      quantity: roundInventoryValue(entry.quantity),
      amount: roundInventoryValue(entry.amount, 2),
    }))
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 8);

  return {
    dashboard: {
      totalItems: items.length,
      lowStockItems: items.filter((item) => item.currentStock <= item.reorderLevel).length,
      outOfStockItems: items.filter((item) => item.currentStock <= 0).length,
      stockValue: roundInventoryValue(lotValue, 2),
      expiringLots: expiringLots.length,
      expiredLots: expiredLots.length,
      movement: {
        inwardQuantity: roundInventoryValue(movement.inwardQuantity),
        inwardAmount: roundInventoryValue(movement.inwardAmount, 2),
        outwardQuantity: roundInventoryValue(movement.outwardQuantity),
        outwardAmount: roundInventoryValue(movement.outwardAmount, 2),
      },
      topConsumption,
    },
    masters: {
      ...masters,
      items,
    },
    recipes,
    products: products.map((product) => serializeProduct(product.toObject())),
    recentTransactions: transactions.map((transaction) => ({
      ...transaction,
      supplierName: supplierMap.get(transaction.supplierId)?.name ?? '',
      fromLocationName: locationMap.get(transaction.fromLocationId)?.name ?? '',
      toLocationName: locationMap.get(transaction.toLocationId)?.name ?? '',
      lines: transaction.lines.map((line: InventoryServiceTransactionLine) => ({
        ...line,
        locationName: locationMap.get(line.locationId)?.name ?? '',
        unitName: unitMap.get(line.unitId)?.name ?? '',
      })),
    })),
    expiringLots,
    expiredLots,
    recentAudits: audits,
    permissions: getInventoryPermissions(user.role),
  };
}

export async function getRecipeDrivenProductStock(
  user: InventoryUserContext,
  products: Array<{
    _id: { toString(): string };
    stockQuantity: number;
    isAvailable: boolean;
  } & Record<string, unknown>>,
) {
  await ensureInventorySetup(user);
  const productIds = products.map((product) => product._id.toString());
  const recipes = await InventoryRecipe.find({
    ...scopeFilter(user),
    productId: { $in: productIds },
    isActive: true,
  });

  if (recipes.length === 0) {
    return products;
  }

  const itemIds = [...new Set(recipes.flatMap((recipe) => recipe.lines.map((line: InventoryServiceRecipeLine) => line.inventoryItemId)))];
  const items = await InventoryItem.find({
    ...scopeFilter(user),
    _id: { $in: itemIds },
  });
  const itemMap = new Map(items.map((item) => [item._id.toString(), item]));
  const recipeMap = new Map(recipes.map((recipe) => [recipe.productId, recipe]));

  return products.map((product) => {
    const recipe = recipeMap.get(product._id.toString());
    if (!recipe || recipe.lines.length === 0) {
      return product;
    }

    const possibleServings = recipe.lines.map((line: InventoryServiceRecipeLine) => {
      const item = itemMap.get(line.inventoryItemId);
      if (!item) {
        return 0;
      }

      const requiredPerServe = (line.quantity * (1 + (line.wastagePercent ?? 0) / 100)) / (recipe.yieldQuantity || 1);
      if (requiredPerServe <= 0) {
        return Number.MAX_SAFE_INTEGER;
      }

      return Math.floor(item.currentStock / requiredPerServe);
    });

    const stockQuantity = possibleServings.length > 0 ? Math.max(Math.min(...possibleServings), 0) : 0;

    return {
      ...product,
      stockQuantity,
      isAvailable: stockQuantity > 0,
    };
  });
}

export async function postInventoryForSale(
  user: InventoryUserContext,
  input: {
    invoiceId: string;
    invoiceNumber: string;
    soldItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
    }>;
  },
) {
  await ensureInventorySetup(user);
  const soldProductIds = input.soldItems.map((item) => item.productId);
  const recipes = await InventoryRecipe.find({
    ...scopeFilter(user),
    productId: { $in: soldProductIds },
    isActive: true,
  });

  if (recipes.length === 0) {
    return {
      transaction: null,
      recipeTrackedProductIds: new Set<string>(),
      costByProductId: new Map<string, number>(),
    };
  }

  const itemIds = [...new Set(recipes.flatMap((recipe) => recipe.lines.map((line: InventoryServiceRecipeLine) => line.inventoryItemId)))];
  const items = await InventoryItem.find({
    ...scopeFilter(user),
    _id: { $in: itemIds },
    isActive: true,
  });

  const itemMap = new Map(items.map((item) => [item._id.toString(), item]));
  const recipeMap = new Map(recipes.map((recipe) => [recipe.productId, recipe]));
  const movementLines: InventoryTransactionLineInput[] = [];
  const recipeTrackedProductIds = new Set<string>();

  for (const soldItem of input.soldItems) {
    const recipe = recipeMap.get(soldItem.productId);
    if (!recipe) {
      continue;
    }

    recipeTrackedProductIds.add(soldItem.productId);

    for (const ingredient of recipe.lines) {
      const inventoryItem = itemMap.get(ingredient.inventoryItemId);
      if (!inventoryItem) {
        throw new Error(`Recipe ingredient is missing for ${soldItem.productName}.`);
      }

      const requiredQuantity =
        (soldItem.quantity * ingredient.quantity * (1 + (ingredient.wastagePercent ?? 0) / 100)) /
        (recipe.yieldQuantity || 1);

      movementLines.push({
        inventoryItemId: inventoryItem._id.toString(),
        locationId: inventoryItem.defaultLocationId,
        quantity: roundInventoryValue(requiredQuantity),
        unitCost: inventoryItem.averageCost || inventoryItem.lastPurchaseCost || 0,
        reason: `Consumed for ${soldItem.productName}`,
        productId: soldItem.productId,
        productName: soldItem.productName,
      });
    }
  }

  if (movementLines.length === 0) {
    return {
      transaction: null,
      recipeTrackedProductIds,
      costByProductId: new Map<string, number>(),
    };
  }

  const posted = await createInventoryTransaction(user, {
    direction: 'out',
    movementType: 'sale',
    reason: `Billing sale ${input.invoiceNumber}`,
    notes: `Auto-posted from invoice ${input.invoiceNumber}`,
    referenceType: 'invoice',
    referenceId: input.invoiceId,
    sourceModule: 'billing',
    lines: movementLines,
  });

  const costByProductId = new Map<string, number>();
  posted.lines.forEach((line: InventoryServiceTransactionLine) => {
    if (!line.productId) {
      return;
    }

    costByProductId.set(
      line.productId,
      roundInventoryValue((costByProductId.get(line.productId) ?? 0) + line.totalAmount, 2),
    );
  });

  return {
    transaction: posted,
    recipeTrackedProductIds,
    costByProductId,
  };
}
