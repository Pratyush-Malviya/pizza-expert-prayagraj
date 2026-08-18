export type UserRole = 
  | 'super_admin'
  | 'manager'
  | 'staff'
  | 'driver'
  | 'viewer'
  | 'customer'

export type PermissionKey =
  | 'orders:view'
  | 'orders:edit'
  | 'orders:delete'
  | 'orders:refund'
  | 'kitchen:prepare'
  | 'fleet:view'
  | 'fleet:dispatch'
  | 'fleet:drive'
  | 'catalog:manage'
  | 'inventory:manage'
  | 'customers:manage'
  | 'staff:manage'
  | 'drivers:manage'
  | 'rbac:assign'
  | 'analytics:view'
  | 'financials:view'
  | 'settings:manage'
  | 'audit:view'

export interface RoleDefinition {
  role: UserRole
  label: string
  description: string
  badgeColor: string
  textColor: string
  borderColor: string
  level: number
  permissions: PermissionKey[]
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  super_admin: {
    role: 'super_admin',
    label: 'Super Admin',
    description: 'Complete unrestricted control over business financials, database, staff, fleet, and settings.',
    badgeColor: 'bg-red-100',
    textColor: 'text-red-900',
    borderColor: 'border-red-300',
    level: 100,
    permissions: [
      'orders:view', 'orders:edit', 'orders:delete', 'orders:refund',
      'kitchen:prepare',
      'fleet:view', 'fleet:dispatch', 'fleet:drive',
      'catalog:manage', 'inventory:manage',
      'customers:manage', 'staff:manage', 'drivers:manage', 'rbac:assign',
      'analytics:view', 'financials:view', 'settings:manage', 'audit:view'
    ]
  },
  manager: {
    role: 'manager',
    label: 'Store Manager',
    description: 'Full store operations access, order dispatch, inventory, customer refunds, and staff shift control.',
    badgeColor: 'bg-purple-100',
    textColor: 'text-purple-900',
    borderColor: 'border-purple-300',
    level: 80,
    permissions: [
      'orders:view', 'orders:edit', 'orders:refund',
      'kitchen:prepare',
      'fleet:view', 'fleet:dispatch',
      'catalog:manage', 'inventory:manage',
      'customers:manage', 'staff:manage', 'drivers:manage',
      'analytics:view', 'audit:view'
    ]
  },
  staff: {
    role: 'staff',
    label: 'Kitchen & Counter Staff',
    description: 'Kitchen display system (KDS), baking orders, marking items ready, and counter order entry.',
    badgeColor: 'bg-blue-100',
    textColor: 'text-blue-900',
    borderColor: 'border-blue-300',
    level: 40,
    permissions: [
      'orders:view', 'orders:edit',
      'kitchen:prepare',
      'catalog:manage'
    ]
  },
  driver: {
    role: 'driver',
    label: 'Delivery Partner',
    description: 'Dedicated rider app, GPS broadcasting, route navigation, and customer doorstep OTP validation.',
    badgeColor: 'bg-amber-100',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-300',
    level: 20,
    permissions: [
      'orders:view',
      'fleet:drive'
    ]
  },
  viewer: {
    role: 'viewer',
    label: 'Auditor / Viewer',
    description: 'Read-only access to sales reports, customer logs, order statuses, and operational metrics.',
    badgeColor: 'bg-stone-100',
    textColor: 'text-stone-800',
    borderColor: 'border-stone-300',
    level: 10,
    permissions: [
      'orders:view',
      'fleet:view',
      'analytics:view',
      'audit:view'
    ]
  },
  customer: {
    role: 'customer',
    label: 'Customer / Guest',
    description: 'Public ordering, cart, live GPS pizza tracking, and loyalty points rewards.',
    badgeColor: 'bg-emerald-100',
    textColor: 'text-emerald-900',
    borderColor: 'border-emerald-300',
    level: 0,
    permissions: [
      'orders:view'
    ]
  }
}

export const ALL_PERMISSIONS: { key: PermissionKey; label: string; category: string }[] = [
  // Orders & Sales
  { key: 'orders:view', label: 'View Incoming Orders', category: 'Orders & Sales' },
  { key: 'orders:edit', label: 'Update Status & Edit Details', category: 'Orders & Sales' },
  { key: 'orders:refund', label: 'Authorize Refunds', category: 'Orders & Sales' },
  { key: 'orders:delete', label: 'Delete Orders', category: 'Orders & Sales' },

  // Kitchen
  { key: 'kitchen:prepare', label: 'Access Kitchen Display (KDS)', category: 'Kitchen Operations' },

  // Fleet & Logistics
  { key: 'fleet:view', label: 'View Fleet Radar Map', category: 'Fleet & Logistics' },
  { key: 'fleet:dispatch', label: 'Auto-Dispatch & Assign Drivers', category: 'Fleet & Logistics' },
  { key: 'fleet:drive', label: 'Access Rider Portal & Broadcast GPS', category: 'Fleet & Logistics' },

  // Catalog & Inventory
  { key: 'catalog:manage', label: 'Edit Pizza Menu & Pricing', category: 'Catalog & Inventory' },
  { key: 'inventory:manage', label: 'Manage Ingredients & Stock', category: 'Catalog & Inventory' },

  // User Management & RBAC
  { key: 'staff:manage', label: 'Manage Staff Roster & Shifts', category: 'Team & Security' },
  { key: 'drivers:manage', label: 'Onboard & Verify Delivery Partners', category: 'Team & Security' },
  { key: 'rbac:assign', label: 'Assign & Change User Roles', category: 'Team & Security' },
  { key: 'audit:view', label: 'Inspect Security Audit Logs', category: 'Team & Security' },

  // Financials & Admin
  { key: 'financials:view', label: 'View Revenue & Financial Reports', category: 'Store Admin' },
  { key: 'settings:manage', label: 'Modify Store Config & Gateway Keys', category: 'Store Admin' },
]

export function hasPermission(role: UserRole | string, permission: PermissionKey): boolean {
  const def = ROLE_DEFINITIONS[role as UserRole]
  if (!def) return false
  return def.permissions.includes(permission)
}

export const PRIMARY_SUPER_ADMIN_EMAILS = [
  'malviya.pratyush26@gmail.com',
  'admin@demo.com',
]

export function isPrimarySuperAdmin(
  userOrEmailOrId?: string | { email?: string; id?: string; name?: string; role?: string } | null
): boolean {
  if (!userOrEmailOrId) return false
  if (typeof userOrEmailOrId === 'string') {
    const clean = userOrEmailOrId.trim().toLowerCase()
    return (
      PRIMARY_SUPER_ADMIN_EMAILS.includes(clean) ||
      clean === 'usr-01'
    )
  }
  const email = userOrEmailOrId.email?.trim().toLowerCase() || ''
  const id = userOrEmailOrId.id?.trim().toLowerCase() || ''
  return (
    PRIMARY_SUPER_ADMIN_EMAILS.includes(email) ||
    id === 'usr-01'
  )
}

export function canDeleteTargetUser(
  actorEmailOrRole: string,
  target: { email?: string; id?: string; name?: string; role?: string }
): { allowed: boolean; reason?: string } {
  // 1. Primary super admin cannot be deleted by anyone under any circumstances
  if (isPrimarySuperAdmin(target)) {
    return {
      allowed: false,
      reason: 'The Primary Super Admin (Root / Founder) is permanently protected and cannot be deleted.',
    }
  }

  // 2. If actor is Primary Super Admin, they can delete anyone
  if (isPrimarySuperAdmin(actorEmailOrRole)) {
    return { allowed: true }
  }

  // 3. Secondary Super Admins cannot delete other Super Admins
  if (target.role === 'super_admin') {
    return {
      allowed: false,
      reason: 'Only the Primary Super Admin can manage or remove Super Admin accounts.',
    }
  }

  return { allowed: true }
}

export function canModifyTargetUser(
  actorEmailOrRole: string,
  target: { email?: string; id?: string; name?: string; role?: string },
  newRole?: string,
  newActiveStatus?: boolean
): { allowed: boolean; reason?: string } {
  // 1. Primary super admin cannot be demoted or deactivated
  if (isPrimarySuperAdmin(target)) {
    if (newRole && newRole !== 'super_admin') {
      return {
        allowed: false,
        reason: 'The Primary Super Admin cannot be demoted from the Super Admin role.',
      }
    }
    if (newActiveStatus === false) {
      return {
        allowed: false,
        reason: 'The Primary Super Admin cannot be suspended or deactivated.',
      }
    }
  }

  // 2. Secondary Super Admins cannot modify or demote other Super Admins
  if (target.role === 'super_admin' && !isPrimarySuperAdmin(actorEmailOrRole)) {
    return {
      allowed: false,
      reason: 'Only the Primary Super Admin can modify Super Admin accounts.',
    }
  }

  return { allowed: true }
}
