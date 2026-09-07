import axios from 'axios'
import { TOKEN_KEY, USER_KEY } from '@/config/authConstants'

function resolveAdminApiBase() {
  const unified = String(import.meta.env.VITE_CNBER_API_BASE_URL || '').trim()
  const legacy = String(import.meta.env.VITE_API_BASE_URL || '').trim()
  const raw = (unified || legacy).replace(/\/+$/, '')
  if (!raw) return '/api'
  // H5 Preview：拒绝局域网 / localhost 作为公网 API
  if (
    /^(https?:\/\/)?(127\.0\.0\.1|localhost|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(
      raw
    )
  ) {
    console.warn('[API BASE URL] Admin Preview 拒绝局域网/localhost：', raw)
    return '/api'
  }
  return raw
}

const baseURL = resolveAdminApiBase()

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
        const base = import.meta.env.BASE_URL || '/'
        window.location.href = `${base}login`.replace(/([^:]\/)\/+/g, '$1')
      }
    }
    const msg =
      err.response?.data?.message || err.message || '网络错误'
    return Promise.reject(new Error(msg))
  }
)
