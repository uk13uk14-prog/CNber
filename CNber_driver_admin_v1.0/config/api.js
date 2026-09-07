/**
 * 后端 API 根路径
 *
 * app-plus 真机：固定走 M1 LAN（192.168.1.187），忽略 .env 里 127.0.0.1/localhost
 * H5 Preview：仅接受显式 UNI_APP_API_BASE_URL / VITE_API_BASE_URL，且拒绝局域网/localhost
 * app-plus 真机无全局 URL，仅用字符串解析，勿使用 new URL()。
 */
const DEFAULT_APP_PLUS_API_BASE_URL = 'http://192.168.1.187:3100/api'

/** 构建时由 Vite 替换为字面量 */
const BUILT_UNI_APP_API_BASE_URL =
  import.meta.env.UNI_APP_API_BASE_URL || import.meta.env.VITE_API_BASE_URL
const BUILT_UNI_PLATFORM = import.meta.env.UNI_PLATFORM

function trimApiBaseUrl(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  return value.replace(/\/+$/, '')
}

function isLocalhostApiUrl(url) {
  if (!url) return false
  return /^(https?:\/\/)?(127\.0\.0\.1|localhost)([:/]|$)/i.test(url)
}

function isBlockedPreviewHost(url) {
  if (!url) return false
  return /^(https?:\/\/)?(127\.0\.0\.1|localhost|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(
    url
  )
}

function isAppPlusRuntime() {
  if (BUILT_UNI_PLATFORM === 'app-plus') return true
  try {
    return typeof plus !== 'undefined'
  } catch (e) {
    return false
  }
}

function isH5Runtime() {
  if (BUILT_UNI_PLATFORM === 'h5') return true
  // #ifdef H5
  return true
  // #endif
  // #ifndef H5
  return false
  // #endif
}

function getDefaultApiBaseUrl() {
  if (isAppPlusRuntime()) return DEFAULT_APP_PLUS_API_BASE_URL
  if (isH5Runtime()) return ''
  return ''
}

function resolveApiBaseUrl() {
  const fromEnv = trimApiBaseUrl(BUILT_UNI_APP_API_BASE_URL)

  if (isAppPlusRuntime()) {
    if (fromEnv && !isLocalhostApiUrl(fromEnv)) {
      return fromEnv
    }
    return trimApiBaseUrl(DEFAULT_APP_PLUS_API_BASE_URL)
  }

  if (fromEnv) {
    if (isH5Runtime() && isBlockedPreviewHost(fromEnv)) {
      console.warn('[API BASE URL] H5 Preview 拒绝局域网/localhost：', fromEnv)
      return ''
    }
    return fromEnv
  }
  return trimApiBaseUrl(getDefaultApiBaseUrl())
}

/** 每次请求解析，避免模块加载早于 plus 就绪 */
export function getApiBaseUrl() {
  return resolveApiBaseUrl()
}

export const BASE_URL = getApiBaseUrl()
export const API_PUBLIC_BLOCKED = !BASE_URL

console.log('[API BASE URL]', BASE_URL || '(empty / API_PUBLIC_BLOCKED)')

/** 登录失效时 reLaunch 的页面路径（须与 pages.json 一致） */
export const LOGIN_PATH = '/pages/D0002_driver_login'
