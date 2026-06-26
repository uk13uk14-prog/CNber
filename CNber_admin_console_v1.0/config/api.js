/**
 * 配置层：API 根路径、登录页路径、环境名
 * 可在「设置」页写入 `cnber_admin_api_base` 覆盖默认 BASE（不含末尾 /）
 */

const DEFAULT_BASE = 'http://127.0.0.1:3100/api'

/**
 * 构建时由 Vite 替换为字面量；勿在运行时读取 import.meta.env 对象（app-plus 无全局 URL）。
 */
const BUILT_UNI_APP_API_BASE_URL = import.meta.env.UNI_APP_API_BASE_URL
const BUILT_VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const STORAGE_TOKEN = 'cnber_admin_token'
export const STORAGE_USER = 'cnber_admin_user'
export const STORAGE_API_BASE = 'cnber_admin_api_base'

/** 与 pages.json 中登录页 path 一致（H5 hash 模式下 reLaunch 使用） */
export const LOGIN_PATH = '/pages/B0001_admin_login'

function trimApiBaseUrl(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  return value.replace(/\/+$/, '')
}

function getEnvApiBaseUrl() {
  const fromUni = trimApiBaseUrl(BUILT_UNI_APP_API_BASE_URL)
  if (fromUni) return fromUni
  const fromVite = trimApiBaseUrl(BUILT_VITE_API_BASE_URL)
  if (fromVite) return fromVite
  try {
    if (typeof process !== 'undefined' && process.env) {
      const fromProcess = trimApiBaseUrl(
        process.env.UNI_APP_API_BASE_URL || process.env.VITE_API_BASE_URL
      )
      if (fromProcess) return fromProcess
    }
  } catch (e) {
    /* ignore */
  }
  return ''
}

export function getBaseUrl() {
  try {
    const s = uni.getStorageSync(STORAGE_API_BASE)
    if (s && typeof s === 'string' && s.trim()) {
      return trimApiBaseUrl(s)
    }
  } catch (e) {
    /* ignore */
  }
  return trimApiBaseUrl(getEnvApiBaseUrl() || DEFAULT_BASE)
}

export function getEnvLabel() {
  const u = getBaseUrl()
  if (u.includes('localhost') || u.includes('127.0.0.1')) return 'development'
  return 'custom'
}
