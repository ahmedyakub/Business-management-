// Role-based access control. Each role maps to a list of "resource:action" permissions.
// "*" grants everything.
export const ROLES = ['admin', 'manager', 'cashier', 'inventory'];

export const ROLE_PERMISSIONS = {
  admin: ['*'],
  manager: [
    'dashboard:read',
    'products:read', 'products:write',
    'categories:read', 'categories:write',
    'customers:read', 'customers:write',
    'suppliers:read', 'suppliers:write',
    'sales:read', 'sales:write', 'sales:void',
    'purchases:read', 'purchases:write',
    'expenses:read', 'expenses:write',
    'payments:read', 'payments:write',
    'reports:read', 'reports:inventory',
    'notifications:read',
    'settings:read',
  ],
  cashier: [
    'dashboard:read',
    'products:read', 'categories:read',
    'customers:read', 'customers:write',
    'sales:read', 'sales:write',
    'payments:read', 'payments:write',
    'notifications:read',
    'settings:read',
  ],
  inventory: [
    'dashboard:read',
    'products:read', 'products:write',
    'categories:read', 'categories:write',
    'suppliers:read', 'suppliers:write',
    'purchases:read', 'purchases:write',
    'reports:inventory',
    'notifications:read',
    'settings:read',
  ],
};

export function permissionsFor(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role, permission) {
  const perms = permissionsFor(role);
  return perms.includes('*') || perms.includes(permission);
}
