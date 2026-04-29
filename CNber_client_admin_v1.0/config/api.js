/**
 * 后端 API 根路径
 *
 * ⚠️ 真机、模拟器、小程序上「localhost / 127.0.0.1」指向设备自身，无法访问你电脑上的 Node，
 *    会导致下单成功但列表永远空、请求失败。
 * 请把 API_HOST 改为你电脑的局域网 IPv4（与手机同一 WiFi），例如 192.168.1.8。
 * Windows: ipconfig；macOS: 系统设置 → 网络。
 */
const API_HOST = '192.168.1.187'
const API_PORT = '3100'

export const BASE_URL = `http://${API_HOST}:${API_PORT}/api`

/** 开发环境打印 API 根路径，生产构建不执行 */
if (
  process.env.NODE_ENV === 'development' ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV)
) {
  console.log('[API BASE URL]', BASE_URL)
}

/** 登录失效时 reLaunch 的页面路径（须与 pages.json 一致） */
export const LOGIN_PATH = '/pages/A0002_client_login_v01'
