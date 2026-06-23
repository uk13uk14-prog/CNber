import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isStaffRole } from '@/utils/staffRoles'
import { ROUTE_MODULE_MAP } from '@/utils/permissionMatrix'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { module: 'dashboard', title: '工作台' }
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('@/views/OrdersView.vue'),
        meta: { module: 'orders', title: '订单' }
      },
      {
        path: 'orders/:id',
        name: 'order-detail',
        component: () => import('@/views/OrderDetailView.vue'),
        meta: { module: 'orders' }
      },
      {
        path: 'orders/:id/dispatch',
        name: 'order-dispatch',
        component: () => import('@/views/DispatchView.vue'),
        meta: { module: 'dispatch' }
      },
      {
        path: 'dispatch-center',
        name: 'dispatch-center',
        component: () => import('@/views/DispatchCenterView.vue'),
        meta: { module: 'dispatch', title: '调度中心' }
      },
      {
        path: 'drivers',
        name: 'drivers',
        component: () => import('@/views/DriversView.vue'),
        meta: { module: 'drivers', title: '司机' }
      },
      {
        path: 'driver-onboarding',
        name: 'driver-onboarding',
        component: () => import('@/views/DriverOnboardingView.vue'),
        meta: { module: 'driver_approval', title: '司机审核' }
      },
      {
        path: 'driver-profiles',
        name: 'driver-profiles',
        component: () => import('@/views/DriverProfilesView.vue'),
        meta: { module: 'driver_profiles', title: '司机画像' }
      },
      {
        path: 'customers',
        name: 'customers',
        component: () => import('@/views/CustomersView.vue'),
        meta: { module: 'customers', title: '客户' }
      },
      {
        path: 'customer-profiles',
        name: 'customer-profiles',
        component: () => import('@/views/CustomerProfilesView.vue'),
        meta: { module: 'customer_profiles', title: '客户画像' }
      },
      {
        path: 'payment-reviews',
        name: 'payment-reviews',
        component: () => import('@/views/PaymentReviewCenterView.vue'),
        meta: { module: 'payment_reviews', title: '支付审核' }
      },
      {
        path: 'finance',
        name: 'finance',
        component: () => import('@/views/FinancialView.vue'),
        meta: { module: 'finance', title: '财务对账' }
      },
      {
        path: 'driver-settlements',
        name: 'driver-settlements',
        component: () => import('@/views/DriverSettlementsView.vue'),
        meta: { module: 'driver_settlements', title: '司机结算' }
      },
      {
        path: 'support-tickets',
        name: 'support-tickets',
        component: () => import('@/views/SupportTicketsView.vue'),
        meta: { module: 'support_tickets', title: '工单管理' }
      },
      {
        path: 'pricing',
        name: 'pricing',
        component: () => import('@/views/PricingRulesView.vue'),
        meta: { module: 'pricing', title: '报价设置' }
      },
      {
        path: 'coupons',
        name: 'coupons',
        component: () => import('@/views/CouponsView.vue'),
        meta: { module: 'coupons', title: '优惠券' }
      },
      {
        path: 'campaigns',
        name: 'campaigns',
        component: () => import('@/views/CampaignsView.vue'),
        meta: { module: 'campaigns', title: '活动管理' }
      },
      {
        path: 'crm',
        name: 'crm',
        component: () => import('@/views/CRMMarketingView.vue'),
        meta: { module: 'crm', title: 'CRM营销中心' }
      },
      {
        path: 'staff',
        name: 'staff',
        component: () => import('@/views/StaffView.vue'),
        meta: { module: 'staff', title: '员工管理' }
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('@/views/RolesView.vue'),
        meta: { module: 'roles', title: '角色权限' }
      },
      {
        path: 'system-settings',
        name: 'system-settings',
        component: () => import('@/views/SystemSettingsView.vue'),
        meta: { module: 'system_settings', title: '系统设置' }
      },
      {
        path: 'trial-dashboard',
        name: 'trial-dashboard',
        component: () => import('@/views/TrialOperationsDashboard.vue'),
        meta: { module: 'trial_operations', title: '试运营看板' }
      },
      {
        path: 'audit-logs',
        name: 'audit-logs',
        component: () => import('@/views/AuditLogsView.vue'),
        meta: { module: 'audit_logs', title: '操作日志' }
      },
      {
        path: 'backup-center',
        name: 'backup-center',
        component: () => import('@/views/BackupCenterView.vue'),
        meta: { module: 'backup_center', title: '数据备份' }
      },
      {
        path: 'system-health',
        name: 'system-health',
        component: () => import('@/views/SystemHealthView.vue'),
        meta: { module: 'system_health', title: '系统状态' }
      },
      {
        path: 'payment-settings',
        name: 'payment-settings',
        component: () => import('@/views/PaymentSettingsView.vue'),
        meta: { module: 'system_settings' }
      },
      {
        path: 'payment-accounts',
        redirect: { name: 'payment-settings' }
      },
      {
        path: 'pricing-rules',
        redirect: { name: 'pricing' }
      },
      {
        path: 'driver-approval',
        redirect: { name: 'driver-onboarding' }
      },
      {
        path: 'payment-review',
        redirect: { name: 'payment-reviews' }
      },
      {
        path: 'finance-reconciliation',
        redirect: { name: 'finance' }
      },
      {
        path: 'forbidden',
        name: 'forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
        meta: { requiresAuth: true }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes
})

function defaultRouteForPermissions(auth) {
  if (auth.can('dashboard', 'view')) return '/'
  for (const mod of Object.values(ROUTE_MODULE_MAP)) {
    if (mod !== 'dashboard' && auth.can(mod, 'view')) {
      const path = Object.entries(ROUTE_MODULE_MAP).find(([, m]) => m === mod)?.[0]
      if (path) return path
    }
  }
  return '/forbidden'
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) return true
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAuth && !isStaffRole(auth.staffRole)) {
    auth.clear()
    return { name: 'login' }
  }
  if (auth.isAuthenticated && !auth.permissionsLoaded) {
    await auth.loadPermissions()
  }
  const module = to.meta.module
  if (module && to.name !== 'forbidden' && !auth.can(module, 'view')) {
    return { name: 'forbidden' }
  }
  return true
})

export { defaultRouteForPermissions }
export default router
