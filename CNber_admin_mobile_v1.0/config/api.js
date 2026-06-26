/**
 * 后端 API 根路径（与 console 同模式，可在「我的」页覆盖）
 */
const DEFAULT_LOCAL_API_BASE_URL = 'http://127.0.0.1:3100/api'
const DEFAULT_APP_PLUS_API_BASE_URL = 'http://192.168.1.187:3100/api'

const BUILT_UNI_APP_API_BASE_URL = import.meta.env.UNI_APP_API_BASE_URL
const BUILT_UNI_PLATFORM = import.meta.env.UNI_PLATFORM

export const STORAGE_API_BASE = 'cnber_admin_mobile_api_base'
export const LOGIN_PATH = '/pages/M0001_admin_login'

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

function resolveDefaultApiBaseUrl() {
  const fromEnv = trimApiBaseUrl(BUILT_UNI_APP_API_BASE_URL)
  if (fromEnv) return fromEnv
  return trimApiBaseUrl(
    isAppPlusRuntime() ? DEFAULT_APP_PLUS_API_BASE_URL : DEFAULT_LOCAL_API_BASE_URL
  )
}

export function getBaseUrl() {
  try {
    const stored = uni.getStorageSync(STORAGE_API_BASE)
    if (stored && typeof stored === 'string' && stored.trim()) {
      return trimApiBaseUrl(stored)
    }
  } catch (e) {
    /* ignore */
  }
  return resolveDefaultApiBaseUrl()
}

export function getEnvLabel() {
  const url = getBaseUrl()
  if (url.includes('localhost') || url.includes('127.0.0.1')) return 'development'
  return 'custom'
}

/** @deprecated 请使用 getBaseUrl() */
export const BASE_URL = getBaseUrl()
