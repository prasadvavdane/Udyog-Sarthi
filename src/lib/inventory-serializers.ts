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

export function serializeInventoryCategory(category: Record<string, unknown>) {
  return {
    id: normalizeId(category._id ?? category.id),
    _id: normalizeId(category._id ?? category.id),
    name: normalizeString(category.name),
    description: normalizeString(category.description),
    isActive: normalizeBoolean(category.isActive, true),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
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
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
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
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
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
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
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
    lastPurchaseDate: item.lastPurchaseDate,
    expiryTracked: normalizeBoolean(item.expiryTracked),
    batchTracked: normalizeBoolean(item.batchTracked, true),
    allowNegativeStock: normalizeBoolean(item.allowNegativeStock),
    isActive: normalizeBoolean(item.isActive, true),
    notes: normalizeString(item.notes),
    lowStock: currentStock <= reorderLevel,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
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
    expiryDate: lot.expiryDate,
    purchaseDate: lot.purchaseDate,
    invoiceNumber: normalizeString(lot.invoiceNumber),
    unitCost: normalizeNumber(lot.unitCost),
    totalAmount: normalizeNumber(lot.totalAmount),
    quantityReceived: normalizeNumber(lot.quantityReceived),
    quantityAvailable: normalizeNumber(lot.quantityAvailable),
    status: normalizeString(lot.status, 'open'),
    createdAt: lot.createdAt,
    updatedAt: lot.updatedAt,
  };
}

export function serializeInventoryTransaction(transaction: Record<string, unknown>) {
  return {
    id: normalizeId(transaction._id ?? transaction.id),
    _id: normalizeId(transaction._id ?? transaction.id),
    movementNumber: normalizeString(transaction.movementNumber),
    movementDate: transaction.movementDate,
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
    approvedAt: transaction.approvedAt,
    cancelledBy: normalizeId(transaction.cancelledBy),
    cancelledAt: transaction.cancelledAt,
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
            expiryDate: line.expiryDate,
            purchaseDate: line.purchaseDate,
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
                    expiryDate: allocation.expiryDate,
                  };
                })
              : [],
          };
        })
      : [],
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
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
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
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
    before: typeof entry.before === 'object' && entry.before !== null ? entry.before : undefined,
    after: typeof entry.after === 'object' && entry.after !== null ? entry.after : undefined,
    referenceId: normalizeString(entry.referenceId),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}
