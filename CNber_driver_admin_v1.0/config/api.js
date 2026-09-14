/**
 * 后端 API 根路径
 *
 * HBuilderX / uni-app Vite 不会把 .env 的 UNI_APP_API_BASE_URL 注入到
 * import.meta.env（产物只有 VITE_*）。app-plus 不能依赖 .env。
 *
 * app-plus：编译期固定 M1 LAN（禁止 127.0.0.1 / localhost）
 * 其它端：可用 .env，否则 localhost 开发回退
 */
const M1_APP_PLUS_API_BASE_URL = 'http://192.168.1.111:3100/api'

function trimApiBaseUrl(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  return value.replace(/\/+$/, '')
}

function resolveApiBaseUrl() {
  // #ifdef APP-PLUS
  return trimApiBaseUrl(M1_APP_PLUS_API_BASE_URL)
  // #endif
  // #ifndef APP-PLUS
  const DEFAULT_LOCAL_API_BASE_URL = 'http://127.0.0.1:3100/api'
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined
  const fromEnv = trimApiBaseUrl(
    (env && (env.UNI_APP_API_BASE_URL || env.VITE_UNI_APP_API_BASE_URL)) || ''
  )
  if (fromEnv) return fromEnv
  return trimApiBaseUrl(DEFAULT_LOCAL_API_BASE_URL)
  // #endif
}

/** 每次请求解析，避免模块加载早于 plus 就绪 */
export function getApiBaseUrl() {
  return resolveApiBaseUrl()
}

export const BASE_URL = getApiBaseUrl()

console.log('[API BASE URL]', BASE_URL)

/** 登录失效时 reLaunch 的页面路径（须与 pages.json 一致） */
export const LOGIN_PATH = '/pages/D0002_driver_login'
