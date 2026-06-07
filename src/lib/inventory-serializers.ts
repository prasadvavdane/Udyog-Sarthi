function normalizeId(value: unknown) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return value.toString();
  }

  return String(value);
}

function normalizeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeSerializableValue(value: unknown): unknown {
  if (value == null) {
    return value;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSerializableValue(entry));
  }

  if (typeof value === 'object') {
    const constructorName = value.constructor?.name;
    if (constructorName === 'ObjectId' || constructorName === 'ObjectID') {
      return value.toString();
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, entry]) => [key, normalizeSerializableValue(entry)] as const)
        .filter(([, entry]) => entry !== undefined),
    );
  }

  return String(value);
}

export function serializeInventoryCategory(category: Record<string, unknown>) {
  return {
    id: normalizeId(category._id ?? category.id),
    _id: normalizeId(category._id ?? category.id),
    name: normalizeString(category.name),
    description: normalizeString(category.description),
    isActive: normalizeBoolean(category.isActive, true),
    createdAt: normalizeSerializableValue(category.createdAt),
    updatedAt: normalizeSerializableValue(category.updatedAt),
  };
}

export function serializeInventoryUnit(unit: Record<string, unknown>) {
  return {
    id: normalizeId(unit._id ?? unit.id),
    _id: normalizeId(unit._id ?? unit.id),
    name: normalizeString(unit.name),
    code: normalizeString(unit.code),
    precision: normalizeNumber(unit.precision, 2),
    isActive: normalizeBoolean(unit.isActive, true),
    createdAt: normalizeSerializableValue(unit.createdAt),
    updatedAt: normalizeSerializableValue(unit.updatedAt),
  };
}

export function serializeInventorySupplier(supplier: Record<string, unknown>) {
  return {
    id: normalizeId(supplier._id ?? supplier.id),
    _id: normalizeId(supplier._id ?? supplier.id),
    name: normalizeString(supplier.name),
    contactPerson: normalizeString(supplier.contactPerson),
    phone: normalizeString(supplier.phone),
    email: normalizeString(supplier.email),
    gstin: normalizeString(supplier.gstin),
    address: normalizeString(supplier.address),
    notes: normalizeString(supplier.notes),
    isActive: normalizeBoolean(supplier.isActive, true),
    createdAt: normalizeSerializableValue(supplier.createdAt),
    updatedAt: normalizeSerializableValue(supplier.updatedAt),
  };
}

export function serializeInventoryLocation(location: Record<string, unknown>) {
  return {
    id: normalizeId(location._id ?? location.id),
    _id: normalizeId(location._id ?? location.id),
    name: normalizeString(location.name),
    code: normalizeString(location.code),
    description: normalizeString(location.description),
    isPrimary: normalizeBoolean(location.isPrimary),
    isActive: normalizeBoolean(location.isActive, true),
    createdAt: normalizeSerializableValue(location.createdAt),
    updatedAt: normalizeSerializableValue(location.updatedAt),
  };
}

export function serializeInventoryItem(item: Record<string, unknown>) {
  const stockByLocation = Array.isArray(item.stockByLocation)
    ? item.stockByLocation.map((entry) => {
        const row = entry as Record<string, unknown>;

        return {
          locationId: normalizeId(row.locationId),
          quantity: normalizeNumber(row.quantity),
        };
      })
    : [];

  const currentStock = normalizeNumber(item.currentStock);
  const reorderLevel = normalizeNumber(item.reorderLevel);

  return {
    id: normalizeId(item._id ?? item.id),
    _id: normalizeId(item._id ?? item.id),
    itemName: normalizeString(item.itemName),
    itemCode: normalizeString(item.itemCode),
    categoryId: normalizeId(item.categoryId),
    unitId: normalizeId(item.unitId),
    defaultSupplierId: normalizeId(item.defaultSupplierId),
    defaultLocationId: normalizeId(item.defaultLocationId),
    reorderLevel,
    reorderQuantity: normalizeNumber(item.reorderQuantity),
    currentStock,
    stockByLocation,
    averageCost: normalizeNumber(item.averageCost),
    lastPurchaseCost: normalizeNumber(item.lastPurchaseCost),
    lastPurchaseDate: normalizeSerializableValue(item.lastPurchaseDate),
    expiryTracked: normalizeBoolean(item.expiryTracked),
    batchTracked: normalizeBoolean(item.batchTracked, true),
    allowNegativeStock: normalizeBoolean(item.allowNegativeStock),
    isActive: normalizeBoolean(item.isActive, true),
    notes: normalizeString(item.notes),
    lowStock: currentStock <= reorderLevel,
    createdAt: normalizeSerializableValue(item.createdAt),
    updatedAt: normalizeSerializableValue(item.updatedAt),
  };
}

export function serializeInventoryLot(lot: Record<string, unknown>) {
  return {
    id: normalizeId(lot._id ?? lot.id),
    _id: normalizeId(lot._id ?? lot.id),
    inventoryItemId: normalizeId(lot.inventoryItemId),
    locationId: normalizeId(lot.locationId),
    supplierId: normalizeId(lot.supplierId),
    transactionId: normalizeId(lot.transactionId),
    batchNumber: normalizeString(lot.batchNumber),
    lotNumber: normalizeString(lot.lotNumber),
    expiryDate: normalizeSerializableValue(lot.expiryDate),
    purchaseDate: normalizeSerializableValue(lot.purchaseDate),
    invoiceNumber: normalizeString(lot.invoiceNumber),
    unitCost: normalizeNumber(lot.unitCost),
    totalAmount: normalizeNumber(lot.totalAmount),
    quantityReceived: normalizeNumber(lot.quantityReceived),
    quantityAvailable: normalizeNumber(lot.quantityAvailable),
    status: normalizeString(lot.status, 'open'),
    createdAt: normalizeSerializableValue(lot.createdAt),
    updatedAt: normalizeSerializableValue(lot.updatedAt),
  };
}

export function serializeInventoryTransaction(transaction: Record<string, unknown>) {
  return {
    id: normalizeId(transaction._id ?? transaction.id),
    _id: normalizeId(transaction._id ?? transaction.id),
    movementNumber: normalizeString(transaction.movementNumber),
    movementDate: normalizeSerializableValue(transaction.movementDate),
    direction: normalizeString(transaction.direction, 'in'),
    movementType: normalizeString(transaction.movementType),
    status: normalizeString(transaction.status, 'posted'),
    reason: normalizeString(transaction.reason),
    notes: normalizeString(transaction.notes),
    sourceModule: normalizeString(transaction.sourceModule, 'inventory'),
    supplierId: normalizeId(transaction.supplierId),
    fromLocationId: normalizeId(transaction.fromLocationId),
    toLocationId: normalizeId(transaction.toLocationId),
    referenceType: normalizeString(transaction.referenceType),
    referenceId: normalizeString(transaction.referenceId),
    relatedTransactionId: normalizeId(transaction.relatedTransactionId),
    approvedBy: normalizeId(transaction.approvedBy),
    approvedAt: normalizeSerializableValue(transaction.approvedAt),
    cancelledBy: normalizeId(transaction.cancelledBy),
    cancelledAt: normalizeSerializableValue(transaction.cancelledAt),
    cancelReason: normalizeString(transaction.cancelReason),
    totalQuantity: normalizeNumber(transaction.totalQuantity),
    totalAmount: normalizeNumber(transaction.totalAmount),
    lines: Array.isArray(transaction.lines)
      ? transaction.lines.map((entry) => {
          const line = entry as Record<string, unknown>;

          return {
            inventoryItemId: normalizeId(line.inventoryItemId),
            itemName: normalizeString(line.itemName),
            unitId: normalizeId(line.unitId),
            locationId: normalizeId(line.locationId),
            quantity: normalizeNumber(line.quantity),
            unitCost: normalizeNumber(line.unitCost),
            totalAmount: normalizeNumber(line.totalAmount),
            batchNumber: normalizeString(line.batchNumber),
            lotNumber: normalizeString(line.lotNumber),
            expiryDate: normalizeSerializableValue(line.expiryDate),
            purchaseDate: normalizeSerializableValue(line.purchaseDate),
            invoiceNumber: normalizeString(line.invoiceNumber),
            reason: normalizeString(line.reason),
            productId: normalizeId(line.productId),
            productName: normalizeString(line.productName),
            allocations: Array.isArray(line.allocations)
              ? line.allocations.map((allocationEntry) => {
                  const allocation = allocationEntry as Record<string, unknown>;

                  return {
                    lotId: normalizeId(allocation.lotId),
                    batchNumber: normalizeString(allocation.batchNumber),
                    quantity: normalizeNumber(allocation.quantity),
                    unitCost: normalizeNumber(allocation.unitCost),
                    expiryDate: normalizeSerializableValue(allocation.expiryDate),
                  };
                })
              : [],
          };
        })
      : [],
    createdAt: normalizeSerializableValue(transaction.createdAt),
    updatedAt: normalizeSerializableValue(transaction.updatedAt),
  };
}

export function serializeInventoryRecipe(recipe: Record<string, unknown>) {
  return {
    id: normalizeId(recipe._id ?? recipe.id),
    _id: normalizeId(recipe._id ?? recipe.id),
    productId: normalizeId(recipe.productId),
    yieldQuantity: normalizeNumber(recipe.yieldQuantity, 1),
    notes: normalizeString(recipe.notes),
    isActive: normalizeBoolean(recipe.isActive, true),
    lines: Array.isArray(recipe.lines)
      ? recipe.lines.map((entry) => {
          const line = entry as Record<string, unknown>;

          return {
            inventoryItemId: normalizeId(line.inventoryItemId),
            quantity: normalizeNumber(line.quantity),
            wastagePercent: normalizeNumber(line.wastagePercent),
            notes: normalizeString(line.notes),
          };
        })
      : [],
    createdAt: normalizeSerializableValue(recipe.createdAt),
    updatedAt: normalizeSerializableValue(recipe.updatedAt),
  };
}

export function serializeInventoryAuditLog(entry: Record<string, unknown>) {
  return {
    id: normalizeId(entry._id ?? entry.id),
    _id: normalizeId(entry._id ?? entry.id),
    entityType: normalizeString(entry.entityType),
    entityId: normalizeId(entry.entityId),
    action: normalizeString(entry.action),
    description: normalizeString(entry.description),
    before:
      typeof entry.before === 'object' && entry.before !== null
        ? (normalizeSerializableValue(entry.before) as Record<string, unknown>)
        : undefined,
    after:
      typeof entry.after === 'object' && entry.after !== null
        ? (normalizeSerializableValue(entry.after) as Record<string, unknown>)
        : undefined,
    referenceId: normalizeString(entry.referenceId),
    createdAt: normalizeSerializableValue(entry.createdAt),
    updatedAt: normalizeSerializableValue(entry.updatedAt),
  };
}
