import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, fetchMyPermissions } from '@/api/admin'
import { TOKEN_KEY, USER_KEY } from '@/config/authConstants'
import { isStaffRole } from '@/utils/staffRoles'
import { hasPermission as checkPermission } from '@/utils/permissionMatrix'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref(JSON.parse(localStorage.getItem(USER_KEY) || 'null'))
  const permissions = ref(null)
  const permissionsLoaded = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const staffRole = computed(() => user.value?.role || '')
  const isStaff = computed(() => isStaffRole(staffRole.value))
  /** 超级管理员 */
  const isAdmin = computed(() => staffRole.value === 'admin')

  function setSession(t, u) {
    token.value = t
    user.value = u
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  }

  function clear() {
    token.value = ''
    user.value = null
    permissions.value = null
    permissionsLoaded.value = false
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function hasPermission(module, action) {
    if (isAdmin.value) return true
    return checkPermission(staffRole.value, module, action, permissions.value)
  }

  function can(module, action) {
    return hasPermission(module, action)
  }

  async function loadPermissions() {
    if (!token.value) {
      permissions.value = null
      permissionsLoaded.value = false
      return null
    }
    try {
      const data = await fetchMyPermissions()
      permissions.value = data?.permissions || {}
      permissionsLoaded.value = true
      return permissions.value
    } catch {
      permissions.value = {}
      permissionsLoaded.value = true
      return permissions.value
    }
  }

  async function login(phone, password) {
    const data = await loginApi(phone, password)
    const u = data?.user
    const t = data?.token
    if (!t || !u) throw new Error('登录响应异常')
    if (!isStaffRole(u.role)) {
      throw new Error('该账号不是后台员工')
    }
    if (u.status === 'banned') {
      throw new Error('账号已禁用，请联系管理员')
    }
    setSession(t, u)
    await loadPermissions()
    return u
  }

  function logout() {
    clear()
  }

  return {
    token,
    user,
    permissions,
    permissionsLoaded,
    staffRole,
    isAuthenticated,
    isStaff,
    isAdmin,
    hasPermission,
    can,
    loadPermissions,
    login,
    logout,
    clear,
    setSession
  }
})
