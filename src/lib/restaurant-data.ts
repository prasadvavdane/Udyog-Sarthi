import Customer from "@/models/Customer";
import Invoice from "@/models/Invoice";
import Product from "@/models/Product";
import RestaurantTable from "@/models/RestaurantTable";
import Settings from "@/models/Settings";
import { getRecipeDrivenProductStock } from "@/lib/inventory-service";
import dbConnect from "@/lib/mongodb";
import { createTableRouteSlug } from "@/lib/restaurant-utils";
import type { TenantSessionUser } from "@/lib/server-auth";
import { isValidObjectId } from "mongoose";

export async function getRestaurantTables(user: TenantSessionUser) {
  await dbConnect();
  return RestaurantTable.find({
    tenantId: user.tenantId,
    isActive: true,
  })
    .sort({ tableName: 1 })
    .lean();
}

export async function getTableById(user: TenantSessionUser, tableId: string) {
  await dbConnect();
  return RestaurantTable.findOne({
    _id: tableId,
    tenantId: user.tenantId,
  }).lean();
}

function decodeTableRouteKey(routeKey: string) {
  try {
    return decodeURIComponent(routeKey).trim();
  } catch {
    return routeKey.trim();
  }
}

export async function getTableByRouteKey(
  user: TenantSessionUser,
  routeKey: string,
) {
  await dbConnect();

  const decodedRouteKey = decodeTableRouteKey(routeKey);
  if (!decodedRouteKey) {
    return null;
  }

  if (isValidObjectId(decodedRouteKey)) {
    const tableById = await RestaurantTable.findOne({
      _id: decodedRouteKey,
      tenantId: user.tenantId,
    }).lean();

    if (tableById) {
      return tableById;
    }
  }

  const tableByName = await RestaurantTable.findOne({
    tenantId: user.tenantId,
    isActive: true,
    tableName: decodedRouteKey,
  })
    .collation({ locale: "en", strength: 2 })
    .lean();

  if (tableByName) {
    return tableByName;
  }

  const requestedSlug = createTableRouteSlug(decodedRouteKey);
  if (!requestedSlug) {
    return null;
  }

  const activeTables = await RestaurantTable.find({
    tenantId: user.tenantId,
    isActive: true,
  }).lean();

  return (
    activeTables.find(
      (table) => createTableRouteSlug(String(table.tableName ?? "")) === requestedSlug,
    ) ?? null
  );
}

export async function getTableDraftInvoice(
  user: TenantSessionUser,
  tableId: string,
) {
  await dbConnect();
  return Invoice.findOne({
    tenantId: user.tenantId,
    tableId,
    invoiceStatus: { $in: ["draft", "active", "paid"] },
  })
    .sort({ updatedAt: -1 })
    .lean();
}

export async function getRestaurantProducts(user: TenantSessionUser) {
  await dbConnect();
  const products = await Product.find({
    tenantId: user.tenantId,
    activeStatus: true,
  })
    .sort({ category: 1, productName: 1 })
    .lean();

  return getRecipeDrivenProductStock(user, products);
}

export async function getRestaurantCustomers(user: TenantSessionUser) {
  await dbConnect();
  return Customer.find({ tenantId: user.tenantId })
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean();
}

export async function getRestaurantSettings(user: TenantSessionUser) {
  await dbConnect();
  return Settings.findOne({ tenantId: user.tenantId }).lean();
}

export async function getRestaurantInvoiceHistory(user: TenantSessionUser) {
  await dbConnect();
  return Invoice.find({
    tenantId: user.tenantId,
    invoiceStatus: { $in: ["paid", "closed"] },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getInvoiceForTenant(
  user: TenantSessionUser,
  invoiceId: string,
) {
  await dbConnect();
  return Invoice.findOne({ _id: invoiceId, tenantId: user.tenantId }).lean();
}
