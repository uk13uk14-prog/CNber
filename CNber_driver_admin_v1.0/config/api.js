/**
 * 后端 API 根路径
 *
 * app-plus 真机：固定走 M1 LAN（192.168.1.187），忽略 .env 里 127.0.0.1/localhost
 * 其他环境：UNI_APP_API_BASE_URL → 默认 127.0.0.1
 * app-plus 真机无全局 URL，仅用字符串解析，勿使用 new URL()。
 */
const DEFAULT_LOCAL_API_BASE_URL = 'http://127.0.0.1:3100/api'
const DEFAULT_APP_PLUS_API_BASE_URL = 'http://192.168.1.187:3100/api'

/** 构建时由 Vite 替换为字面量 */
const BUILT_UNI_APP_API_BASE_URL = import.meta.env.UNI_APP_API_BASE_URL
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

function isAppPlusRuntime() {
  if (BUILT_UNI_PLATFORM === 'app-plus') return true
  try {
    return typeof plus !== 'undefined'
  } catch (e) {
    return false
  }
}

function getDefaultApiBaseUrl() {
  return isAppPlusRuntime() ? DEFAULT_APP_PLUS_API_BASE_URL : DEFAULT_LOCAL_API_BASE_URL
}

function resolveApiBaseUrl() {
  const fromEnv = trimApiBaseUrl(BUILT_UNI_APP_API_BASE_URL)

  if (isAppPlusRuntime()) {
    if (fromEnv && !isLocalhostApiUrl(fromEnv)) {
      return fromEnv
    }
    return trimApiBaseUrl(DEFAULT_APP_PLUS_API_BASE_URL)
  }

  if (fromEnv) return fromEnv
  return trimApiBaseUrl(DEFAULT_LOCAL_API_BASE_URL)
}

/** 每次请求解析，避免模块加载早于 plus 就绪 */
export function getApiBaseUrl() {
  return resolveApiBaseUrl()
}

export const BASE_URL = getApiBaseUrl()

console.log('[API BASE URL]', BASE_URL)

/** 登录失效时 reLaunch 的页面路径（须与 pages.json 一致） */
export const LOGIN_PATH = '/pages/D0002_driver_login'
