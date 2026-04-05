import Customer from '@/models/Customer';
import Invoice from '@/models/Invoice';
import Product from '@/models/Product';
import RestaurantTable from '@/models/RestaurantTable';
import Settings from '@/models/Settings';
import dbConnect from '@/lib/mongodb';
import type { TenantSessionUser } from '@/lib/server-auth';

export async function getRestaurantTables(user: TenantSessionUser) {
  await dbConnect();
  return RestaurantTable.find({
    tenantId: user.tenantId,
    isActive: true,
  }).sort({ tableName: 1 });
}

export async function getTableById(user: TenantSessionUser, tableId: string) {
  await dbConnect();
  return RestaurantTable.findOne({ _id: tableId, tenantId: user.tenantId });
}

export async function getTableDraftInvoice(user: TenantSessionUser, tableId: string) {
  await dbConnect();
  return Invoice.findOne({
    tenantId: user.tenantId,
    tableId,
    invoiceStatus: { $in: ['draft', 'active', 'paid'] },
  }).sort({ updatedAt: -1 });
}

export async function getRestaurantProducts(user: TenantSessionUser) {
  await dbConnect();
  return Product.find({
    tenantId: user.tenantId,
    activeStatus: true,
  }).sort({ category: 1, productName: 1 });
}

export async function getRestaurantCustomers(user: TenantSessionUser) {
  await dbConnect();
  return Customer.find({ tenantId: user.tenantId }).sort({ updatedAt: -1 }).limit(30);
}

export async function getRestaurantSettings(user: TenantSessionUser) {
  await dbConnect();
  return Settings.findOne({ tenantId: user.tenantId });
}

export async function getRestaurantInvoiceHistory(user: TenantSessionUser) {
  await dbConnect();
  return Invoice.find({
    tenantId: user.tenantId,
    invoiceStatus: { $in: ['paid', 'closed'] },
  }).sort({ createdAt: -1 });
}

export async function getInvoiceForTenant(user: TenantSessionUser, invoiceId: string) {
  await dbConnect();
  return Invoice.findOne({ _id: invoiceId, tenantId: user.tenantId });
}
