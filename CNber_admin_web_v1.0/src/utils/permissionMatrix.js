export const PERMISSION_ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'export']

export const PERMISSION_MODULES = [
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

export const MODULE_LABELS = {
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

export const ACTION_LABELS = {
  view: '查看',
  create: '新增',
  update: '编辑',
  delete: '删除/禁用',
  approve: '审核/确认',
  export: '导出'
}

/** 路由 path -> 权限模块 */
export const ROUTE_MODULE_MAP = {
  '/': 'dashboard',
  '/orders': 'orders',
  '/dispatch-center': 'dispatch',
  '/drivers': 'drivers',
  '/driver-onboarding': 'driver_approval',
  '/driver-profiles': 'driver_profiles',
  '/customers': 'customers',
  '/customer-profiles': 'customer_profiles',
  '/support-tickets': 'support_tickets',
  '/payment-reviews': 'payment_reviews',
  '/finance': 'finance',
  '/driver-settlements': 'driver_settlements',
  '/pricing': 'pricing',
  '/coupons': 'coupons',
  '/campaigns': 'campaigns',
  '/crm': 'crm',
  '/staff': 'staff',
  '/roles': 'roles',
  '/system-settings': 'system_settings',
  '/payment-settings': 'system_settings',
  '/trial-dashboard': 'trial_operations',
  '/audit-logs': 'audit_logs',
  '/backup-center': 'backup_center',
  '/operations-dashboard': 'dashboard',
  '/system-health': 'system_health',
  '/job-queue': 'job_queue'
}

export function hasPermission(user, module, action, permissionsMap) {
  const role = user?.role || user
  if (!role) return false
  if (role === 'admin') return true
  if (!permissionsMap || typeof permissionsMap !== 'object') return false
  const actions = permissionsMap[module]
  return Array.isArray(actions) && actions.includes(action)
}

export function canViewModule(role, module, permissionsMap) {
  return hasPermission({ role }, module, 'view', permissionsMap)
}
