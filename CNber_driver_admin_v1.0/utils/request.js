/**
 * uni-app 标准 HTTP 封装
 * 约定后端 JSON：{ code: number, data: object | null, message: string }
 * - code === 0 表示成功
 * - 其它 code 为业务错误（含 401 需重新登录）
 */
import { API_PUBLIC_BLOCKED, getApiBaseUrl, LOGIN_PATH } from '../config/api.js'

/** 业务成功码，与后端统一 */
export const SUCCESS_CODE = 0

/**
 * @typedef {Object} ApiEnvelope
 * @property {number} code
 * @property {any} [data]
 * @property {string} [message]
 */

function normalizeReject(code, message, data = null) {
  return { code, message: message || '请求失败', data }
}

function clearSession() {
  try {
    uni.removeStorageSync('token')
    uni.removeStorageSync('user')
  } catch (e) {
    /* ignore */
  }
}

function relaunchLogin(toastTitle) {
  clearSession()
  uni.showToast({ title: toastTitle, icon: 'none' })
  uni.reLaunch({ url: LOGIN_PATH })
}

/**
 * 解析响应体，尽量得到对象
 * @param {any} raw
 * @returns {{ ok: boolean, body: ApiEnvelope | null }}
 */
function parseBody(raw) {
  if (raw == null) return { ok: false, body: null }
  if (typeof raw === 'object') {
    return { ok: true, body: raw }
  }
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw)
      return typeof o === 'object' && o !== null ? { ok: true, body: o } : { ok: false, body: null }
    } catch {
      return { ok: false, body: null }
    }
  }
  return { ok: false, body: null }
}

/**
 * @param {Object} options
 * @param {string} options.url 相对路径如 /orders/list，或完整 http(s) URL
 * @param {string} [options.method='GET']
 * @param {Object} [options.data]
 * @param {Object} [options.header] 额外头，会合并到默认头
 * @param {boolean} [options.skipAuth=false] true 时不带 Authorization
 * @param {boolean} [options.showErrorToast=true] 业务失败时是否 uni.showToast
 * @param {boolean} [options.fullResponse=false] true 时 resolve 完整 { code, data, message }，否则仅 resolve data
 * @param {number} [options.timeout=20000] 毫秒
 * @returns {Promise<any|ApiEnvelope>}
 */
export function request(options) {
  const {
    url,
    method = 'GET',
    data,
    header: extraHeader = {},
    skipAuth = false,
    showErrorToast = true,
    fullResponse = false,
    timeout = 20000
  } = options

  if (!url) {
    return Promise.reject(normalizeReject(-1, '缺少请求 url'))
  }

  const baseUrl = getApiBaseUrl()
  if (!/^https?:\/\//i.test(url) && (API_PUBLIC_BLOCKED || !baseUrl)) {
    const msg = '公网 API 未配置（API_PUBLIC_BLOCKED），H5 Preview 仅可浏览 UI'
    if (showErrorToast) uni.showToast({ title: msg, icon: 'none' })
    return Promise.reject(normalizeReject(-3, msg, null))
  }

  const header = {
    'Content-Type': 'application/json',
    ...extraHeader
  }

  if (!skipAuth) {
    const token = uni.getStorageSync('token')
    if (token) {
      header.Authorization = `Bearer ${token}`
    }
  }

  const fullUrl = /^https?:\/\//i.test(url) ? url : `${baseUrl.replace(/\/$/, '')}/${String(url).replace(/^\//, '')}`

  return new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method,
      data,
      header,
      timeout,
      success: (result) => {
        const statusCode = result.statusCode
        const { ok, body } = parseBody(result.data)

        if (statusCode === 401) {
          relaunchLogin('未登录或登录已失效')
          return reject(
            normalizeReject(401, (ok && body && body.message) || 'Unauthorized', ok ? body.data : null)
          )
        }

        if (statusCode === 403) {
          uni.showToast({ title: '无权限', icon: 'none' })
          return reject(normalizeReject(403, (ok && body && body.message) || 'Forbidden', ok ? body.data : null))
        }

        if (statusCode >= 500) {
          uni.showToast({ title: '服务器错误', icon: 'none' })
          return reject(
            normalizeReject(statusCode, (ok && body && body.message) || 'Server Error', ok ? body.data : null)
          )
        }

        if (statusCode < 200 || statusCode >= 300) {
          const msg = (ok && body && body.message) || `HTTP ${statusCode}`
          if (showErrorToast) uni.showToast({ title: msg, icon: 'none' })
          return reject(normalizeReject(statusCode, msg, ok ? body.data : null))
        }

        if (!ok || body == null || typeof body.code !== 'number') {
          const msg = '接口未按约定返回 { code, data, message }'
          if (showErrorToast) uni.showToast({ title: msg, icon: 'none' })
          return reject(normalizeReject(-2, msg, result.data))
        }

        if (body.code === SUCCESS_CODE) {
          const envelope = {
            code: body.code,
            data: body.data !== undefined ? body.data : null,
            message: body.message != null ? String(body.message) : 'ok'
          }
          return fullResponse ? resolve(envelope) : resolve(envelope.data)
        }

        const msg = body.message != null ? String(body.message) : '请求失败'
        if (showErrorToast) uni.showToast({ title: msg, icon: 'none' })

        if (body.code === 401) {
          relaunchLogin('未登录或登录已失效')
        }

        return reject(normalizeReject(body.code, msg, body.data !== undefined ? body.data : null))
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || '网络异常'
        uni.showToast({ title: msg, icon: 'none' })
        reject(normalizeReject(-1, msg, null))
      }
    })
  })
}

/** GET */
export function get(url, params = {}, config = {}) {
  return request({ url, method: 'GET', data: params, ...config })
}

/** POST */
export function post(url, data = {}, config = {}) {
  return request({ url, method: 'POST', data, ...config })
}

/** PUT */
export function put(url, data = {}, config = {}) {
  return request({ url, method: 'PUT', data, ...config })
}

/** DELETE */
export function del(url, data = {}, config = {}) {
  return request({ url, method: 'DELETE', data, ...config })
}
