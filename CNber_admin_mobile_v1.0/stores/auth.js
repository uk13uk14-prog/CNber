import { login as loginApi, fetchMyPermissions } from '@/services/adminApi'
import { TOKEN_KEY, USER_KEY, PERMISSIONS_KEY } from '@/config/authConstants'

export const STAFF_ROLES = ['admin', 'operator', 'finance', 'support', 'dispatcher']

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

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export function getUser() {
  try {
    return JSON.parse(uni.getStorageSync(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function getPermissions() {
  try {
    return JSON.parse(uni.getStorageSync(PERMISSIONS_KEY) || 'null')
  } catch {
    return null
  }
}

export function hasPermission(module, action, permissions, role) {
  if (role === 'admin') return true
  const map = permissions || {}
  const mod = map[module]
  if (!mod) return false
  return Boolean(mod[action])
}

/** 页面内权限判断 */
export function can(module, action) {
  const user = getUser()
  return hasPermission(module, action, getPermissions(), user?.role)
}

export function canViewDispatch() {
  return can('dispatch', 'view')
}

export function canViewTickets() {
  return can('support_tickets', 'view')
}

export function canConfirmPayment() {
  return can('payment_reviews', 'approve') || can('dispatch', 'approve')
}

export function canDispatchUpdate() {
  return can('dispatch', 'update')
}

export function canUpdateTickets() {
  return can('support_tickets', 'update')
}

export function canAccessTab(tab, user, permissions) {
  const role = user?.role
  if (role === 'admin') return true
  const tabModules = {
    dashboard: 'dashboard',
    dispatch: 'dispatch',
    tickets: 'support_tickets',
    profile: null
  }
  const mod = tabModules[tab]
  if (!mod) return true
  return hasPermission(mod, 'view', permissions, role)
}

export async function login(phone, password) {
  const data = await loginApi(phone, password)
  const token = data?.token
  const user = data?.user
  if (!token || !user) throw new Error('登录响应异常')
  if (!isStaffRole(user.role)) throw new Error('该账号不是后台员工')
  if (user.status === 'banned') throw new Error('账号已禁用')
  uni.setStorageSync(TOKEN_KEY, token)
  uni.setStorageSync(USER_KEY, JSON.stringify(user))
  const permData = await fetchMyPermissions()
  const permissions = permData?.permissions || {}
  uni.setStorageSync(PERMISSIONS_KEY, JSON.stringify(permissions))
  return user
}

export function logout() {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
  uni.removeStorageSync(PERMISSIONS_KEY)
}
