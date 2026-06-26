export const STAFF_ROLES = ['admin', 'operator', 'finance', 'support', 'dispatcher']

/** @deprecated alias for menu/dashboard access checks */
export const ALL_STAFF = STAFF_ROLES

export const ROLE_LABELS = {
  admin: '超级管理员',
  operator: '运营',
  finance: '财务',
  support: '客服',
  dispatcher: '调度'
}

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role)
}

/** admin 拥有全部菜单 */
export function canAccessRole(userRole, allowedRoles = []) {
  if (!userRole) return false
  if (userRole === 'admin') return true
  return allowedRoles.includes(userRole)
}

export const MENU_GROUPS = [
  {
    title: '订单管理',
    items: [
      { label: '订单', to: '/orders', module: 'orders' },
      { label: '调度中心', to: '/dispatch-center', module: 'dispatch' }
    ]
  },
  {
    title: '司机管理',
    items: [
      { label: '司机', to: '/drivers', module: 'drivers' },
      { label: '司机审核', to: '/driver-onboarding', module: 'driver_approval' },
      { label: '司机画像', to: '/driver-profiles', module: 'driver_profiles' }
    ]
  },
  {
    title: '客户管理',
    items: [
      { label: '客户', to: '/customers', module: 'customers' },
      { label: '客户画像', to: '/customer-profiles', module: 'customer_profiles' }
    ]
  },
  {
    title: '客服中心',
    items: [
      { label: '工单管理', to: '/support-tickets', module: 'support_tickets' }
    ]
  },
  {
    title: '财务中心',
    items: [
      { label: '支付审核', to: '/payment-reviews', module: 'payment_reviews' },
      { label: '财务对账', to: '/finance', module: 'finance' },
      { label: '司机结算', to: '/driver-settlements', module: 'driver_settlements' }
    ]
  },
  {
    title: '运营中心',
    items: [
      { label: '运营驾驶舱', to: '/operations-dashboard', module: 'trial_operations' },
      { label: '报价设置', to: '/pricing', module: 'pricing' },
      { label: '优惠券', to: '/coupons', module: 'coupons' },
      { label: '活动管理', to: '/campaigns', module: 'campaigns' },
      { label: 'CRM营销中心', to: '/crm', module: 'crm' },
      { label: '试运营看板', to: '/trial-dashboard', module: 'trial_operations' }
    ]
  },
  {
    title: '系统管理',
    items: [
      { label: '员工管理', to: '/staff', module: 'staff' },
      { label: '角色权限', to: '/roles', module: 'roles' },
      { label: '系统设置', to: '/system-settings', module: 'system_settings' },
      { label: '操作日志', to: '/audit-logs', module: 'audit_logs' },
      { label: '数据备份', to: '/backup-center', module: 'backup_center' },
      { label: '系统状态', to: '/system-health', module: 'system_health' },
      { label: '任务队列', to: '/job-queue', module: 'job_queue' }
    ]
  }
]

export function filterMenuGroups(userRole, permissions, canViewFn) {
  const canView = canViewFn || ((mod) => canAccessRole(userRole, ['admin']) || false)
  return MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canView(item.module))
  })).filter((group) => group.items.length > 0)
}

export function defaultRouteForRole(role) {
  if (role === 'finance') return '/payment-reviews'
  if (role === 'support') return '/support-tickets'
  if (role === 'dispatcher') return '/orders'
  if (role === 'operator') return '/orders'
  return '/'
}
