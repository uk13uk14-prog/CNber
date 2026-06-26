/** CNber V2 模块级权限矩阵 */
const { STAFF_ROLES } = require('./staffRoles')

const PERMISSION_ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'export']

const PERMISSION_MODULES = [
  'dashboard',
  'orders',
  'dispatch',
  'drivers',
  'driver_approval',
  'driver_profiles',
  'customers',
  'customer_profiles',
  'support_tickets',
  'payment_reviews',
  'finance',
  'driver_settlements',
  'pricing',
  'coupons',
  'campaigns',
  'crm',
  'staff',
  'roles',
  'system_settings',
  'trial_operations',
  'audit_logs',
  'backup_center',
  'system_health',
  'job_queue'
]

const MODULE_LABELS = {
  dashboard: '工作台',
  orders: '订单',
  dispatch: '调度中心',
  drivers: '司机',
  driver_approval: '司机审核',
  driver_profiles: '司机画像',
  customers: '客户',
  customer_profiles: '客户画像',
  support_tickets: '工单管理',
  payment_reviews: '支付审核',
  finance: '财务对账',
  driver_settlements: '司机结算',
  pricing: '报价设置',
  coupons: '优惠券',
  campaigns: '活动管理',
  crm: 'CRM营销中心',
  staff: '员工管理',
  roles: '角色权限',
  system_settings: '系统设置',
  trial_operations: '试运营看板',
  audit_logs: '操作日志',
  backup_center: '数据备份',
  system_health: '系统状态',
  job_queue: '任务队列'
}

const ACTION_LABELS = {
  view: '查看',
  create: '新增',
  update: '编辑',
  delete: '删除/禁用',
  approve: '审核/确认',
  export: '导出'
}

/** @type {Record<string, Record<string, string[]>>} */
const DEFAULT_ROLE_PERMISSIONS = {
  operator: {
    dashboard: ['view'],
    orders: ['view', 'update'],
    dispatch: ['view', 'update'],
    drivers: ['view', 'update'],
    driver_profiles: ['view'],
    customers: ['view', 'update'],
    customer_profiles: ['view'],
    support_tickets: ['view', 'create', 'update'],
    coupons: ['view'],
    campaigns: ['view'],
    crm: ['view', 'export'],
    trial_operations: ['view'],
    system_health: ['view'],
    job_queue: ['view']
  },
  finance: {
    dashboard: ['view'],
    payment_reviews: ['view', 'approve'],
    finance: ['view', 'export'],
    driver_settlements: ['view', 'update', 'approve', 'export'],
    orders: ['view'],
    trial_operations: ['view'],
    backup_center: ['view']
  },
  support: {
    dashboard: ['view'],
    customers: ['view'],
    customer_profiles: ['view'],
    support_tickets: ['view', 'create', 'update'],
    orders: ['view'],
    trial_operations: ['view']
  },
  dispatcher: {
    dashboard: ['view'],
    orders: ['view', 'update'],
    dispatch: ['view', 'update'],
    drivers: ['view'],
    driver_profiles: ['view'],
    trial_operations: ['view']
  }
}

function getFullPermissions() {
  const all = {}
  for (const mod of PERMISSION_MODULES) {
    all[mod] = [...PERMISSION_ACTIONS]
  }
  return all
}

function normalizePermissionsObject(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const mod of PERMISSION_MODULES) {
    const actions = raw[mod]
    if (!Array.isArray(actions)) continue
    const filtered = [...new Set(actions.filter((a) => PERMISSION_ACTIONS.includes(a)))]
    if (filtered.length) out[mod] = filtered
  }
  return out
}

function getPermissionsForRole(role, storedByRole = null) {
  if (role === 'admin') return getFullPermissions()
  if (storedByRole && storedByRole[role]) {
    return normalizePermissionsObject(storedByRole[role])
  }
  return normalizePermissionsObject(DEFAULT_ROLE_PERMISSIONS[role] || {})
}

function hasPermission(user, module, action, permissionsMap) {
  const role = user?.role
  if (!role) return false
  if (role === 'admin') return true
  const perms = permissionsMap || getPermissionsForRole(role)
  const actions = perms[module]
  return Array.isArray(actions) && actions.includes(action)
}

function isEditableRole(role) {
  return STAFF_ROLES.includes(role) && role !== 'admin'
}

module.exports = {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  MODULE_LABELS,
  ACTION_LABELS,
  DEFAULT_ROLE_PERMISSIONS,
  getFullPermissions,
  normalizePermissionsObject,
  getPermissionsForRole,
  hasPermission,
  isEditableRole
}
