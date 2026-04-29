import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
        component: () => import('@/views/DashboardView.vue')
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('@/views/OrdersView.vue')
      },
      {
        path: 'orders/:id',
        name: 'order-detail',
        component: () => import('@/views/OrderDetailView.vue')
      },
      {
        path: 'orders/:id/dispatch',
        name: 'order-dispatch',
        component: () => import('@/views/DispatchView.vue')
      },
      {
        path: 'drivers',
        name: 'drivers',
        component: () => import('@/views/DriversView.vue')
      },
      {
        path: 'pricing',
        name: 'pricing',
        component: () => import('@/views/PricingRulesView.vue')
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) return true
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAuth && !auth.isAdmin) {
    auth.clear()
    return { name: 'login' }
  }
  return true
})

export default router
