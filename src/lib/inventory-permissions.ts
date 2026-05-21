export type InventoryPermission =
  | 'inventory.view'
  | 'inventory.master.create'
  | 'inventory.master.edit'
  | 'inventory.master.delete'
  | 'inventory.transaction.create'
  | 'inventory.transaction.edit'
  | 'inventory.transaction.cancel'
  | 'inventory.transaction.approve'
  | 'inventory.transaction.adjust'
  | 'inventory.recipe.manage'
  | 'inventory.report.view';

const allPermissions: InventoryPermission[] = [
  'inventory.view',
  'inventory.master.create',
  'inventory.master.edit',
  'inventory.master.delete',
  'inventory.transaction.create',
  'inventory.transaction.edit',
  'inventory.transaction.cancel',
  'inventory.transaction.approve',
  'inventory.transaction.adjust',
  'inventory.recipe.manage',
  'inventory.report.view',
];

const inventoryRolePermissions: Record<string, InventoryPermission[]> = {
  'super-admin': allPermissions,
  'business-admin': allPermissions,
  manager: [
    'inventory.view',
    'inventory.master.create',
    'inventory.master.edit',
    'inventory.transaction.create',
    'inventory.transaction.edit',
    'inventory.transaction.cancel',
    'inventory.transaction.approve',
    'inventory.transaction.adjust',
    'inventory.recipe.manage',
    'inventory.report.view',
  ],
  storekeeper: [
    'inventory.view',
    'inventory.master.create',
    'inventory.master.edit',
    'inventory.transaction.create',
    'inventory.transaction.edit',
    'inventory.transaction.cancel',
    'inventory.transaction.adjust',
    'inventory.recipe.manage',
    'inventory.report.view',
  ],
  cashier: ['inventory.view'],
  'billing-staff': ['inventory.view'],
};

export function getInventoryPermissions(role: string) {
  return inventoryRolePermissions[role] ?? [];
}

export function hasInventoryPermission(role: string, permission: InventoryPermission) {
  return getInventoryPermissions(role).includes(permission);
}
