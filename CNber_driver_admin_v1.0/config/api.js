/**
 * 后端 API 根路径
 *
 * ⚠️ 真机、模拟器、小程序上「localhost / 127.0.0.1」指向设备自身，无法访问你电脑上的 Node。
 * 真机调试请通过 UNI_APP_API_BASE_URL 覆盖为电脑局域网 IPv4，例如 http://192.168.1.8:3100/api。
 */
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3100/api'

function getEnvApiBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.UNI_APP_API_BASE_URL || import.meta.env.VITE_API_BASE_URL
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.UNI_APP_API_BASE_URL || process.env.VITE_API_BASE_URL
  }
  return ''
}

export const BASE_URL = (getEnvApiBaseUrl() || DEFAULT_API_BASE_URL).replace(/\/$/, '')

/** 开发环境打印 API 根路径，生产构建不执行 */
if (
  process.env.NODE_ENV === 'development' ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV)
) {
  console.log('[API BASE URL]', BASE_URL)
}

/** 登录失效时 reLaunch 的页面路径（须与 pages.json 一致） */
export const LOGIN_PATH = '/pages/D0002_driver_login'
