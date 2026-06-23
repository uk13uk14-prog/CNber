/**
 * 后端 API 根路径（与 CNber_client_admin_v1.0 同模式）
 */
const DEFAULT_LOCAL_API_BASE_URL = 'http://127.0.0.1:3100/api'
const DEFAULT_APP_PLUS_API_BASE_URL = 'http://192.168.1.187:3100/api'

const BUILT_UNI_APP_API_BASE_URL = import.meta.env.UNI_APP_API_BASE_URL
const BUILT_UNI_PLATFORM = import.meta.env.UNI_PLATFORM

function trimApiBaseUrl(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  return value.replace(/\/+$/, '')
}

function isAppPlusRuntime() {
  if (BUILT_UNI_PLATFORM === 'app-plus') return true
  try {
    return typeof plus !== 'undefined'
  } catch (e) {
    return false
  }
}

function resolveApiBaseUrl() {
  const fromEnv = trimApiBaseUrl(BUILT_UNI_APP_API_BASE_URL)
  if (fromEnv) return fromEnv
  return trimApiBaseUrl(
    isAppPlusRuntime() ? DEFAULT_APP_PLUS_API_BASE_URL : DEFAULT_LOCAL_API_BASE_URL
  )
}

export const BASE_URL = resolveApiBaseUrl()
export const LOGIN_PATH = '/pages/M0001_admin_login'
