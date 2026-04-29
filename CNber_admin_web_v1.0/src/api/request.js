import axios from 'axios'
import { TOKEN_KEY, USER_KEY } from '@/config/authConstants'

const baseURL = import.meta.env.VITE_API_BASE || '/api'

export const http = axios.create({
  baseURL,
  timeout: 30000
})

http.interceptors.request.use((config) => {
  const t = localStorage.getItem(TOKEN_KEY)
  if (t) {
    config.headers.Authorization = `Bearer ${t}`
  }
  return config
})

http.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && typeof body.code === 'number') {
      if (body.code === 0) return body.data !== undefined ? body.data : body
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    return res.data
  },
  (err) => {
    const status = err.response?.status
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    const msg =
      err.response?.data?.message || err.message || '网络错误'
    return Promise.reject(new Error(msg))
  }
)
