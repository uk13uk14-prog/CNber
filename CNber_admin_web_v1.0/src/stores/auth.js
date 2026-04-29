import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi } from '@/api/admin'
import { TOKEN_KEY, USER_KEY } from '@/config/authConstants'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref(JSON.parse(localStorage.getItem(USER_KEY) || 'null'))

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function setSession(t, u) {
    token.value = t
    user.value = u
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  }

  function clear() {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  async function login(phone, password) {
    const data = await loginApi(phone, password)
    const u = data?.user
    const t = data?.token
    if (!t || !u) throw new Error('登录响应异常')
    if (u.role !== 'admin') {
      throw new Error('该账号不是管理员')
    }
    setSession(t, u)
    return u
  }

  function logout() {
    clear()
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    clear,
    setSession
  }
})
