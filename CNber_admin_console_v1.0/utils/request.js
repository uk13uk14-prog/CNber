/**
 * 统一 HTTP：对接 CNber_backend { code, data, message }，code===0 成功
 */
import {
  getBaseUrl,
  LOGIN_PATH,
  STORAGE_TOKEN,
  STORAGE_USER
} from '../config/api.js'

export const SUCCESS_CODE = 0

function normalizeReject(code, message, data = null) {
  return { code, message: message || '请求失败', data }
}

function clearSession() {
  try {
    uni.removeStorageSync(STORAGE_TOKEN)
    uni.removeStorageSync(STORAGE_USER)
  } catch (e) {
    /* ignore */
  }
}

function relaunchLogin(toastTitle) {
  clearSession()
  uni.showToast({ title: toastTitle, icon: 'none' })
  uni.reLaunch({ url: LOGIN_PATH })
}

function parseBody(raw) {
  if (raw == null) return { ok: false, body: null }
  if (typeof raw === 'object') {
    return { ok: true, body: raw }
  }
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw)
      return typeof o === 'object' && o !== null
        ? { ok: true, body: o }
        : { ok: false, body: null }
    } catch {
      return { ok: false, body: null }
    }
  }
  return { ok: false, body: null }
}

/**
 * @param {Object} options
 * @param {string} options.url 相对路径，如 `order/list` 或 `admin/stats`
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

  const header = {
    'Content-Type': 'application/json',
    ...extraHeader
  }

  if (!skipAuth) {
    const token = uni.getStorageSync(STORAGE_TOKEN)
    if (token) {
      header.Authorization = `Bearer ${token}`
    }
  }

  const BASE_URL = getBaseUrl()
  const fullUrl = /^https?:\/\//i.test(url)
    ? url
    : `${BASE_URL.replace(/\/$/, '')}/${String(url).replace(/^\//, '')}`

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
            normalizeReject(
              401,
              (ok && body && body.message) || 'Unauthorized',
              ok ? body.data : null
            )
          )
        }

        if (statusCode === 403) {
          if (showErrorToast) uni.showToast({ title: '无权限', icon: 'none' })
          return reject(
            normalizeReject(
              403,
              (ok && body && body.message) || 'Forbidden',
              ok ? body.data : null
            )
          )
        }

        if (statusCode >= 500) {
          if (showErrorToast) uni.showToast({ title: '服务器错误', icon: 'none' })
          return reject(
            normalizeReject(
              statusCode,
              (ok && body && body.message) || 'Server Error',
              ok ? body.data : null
            )
          )
        }

        if (statusCode < 200 || statusCode >= 300) {
          const msg = (ok && body && body.message) || `HTTP ${statusCode}`
          if (showErrorToast) uni.showToast({ title: msg, icon: 'none' })
          return reject(
            normalizeReject(statusCode, msg, ok ? body.data : null)
          )
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

        return reject(
          normalizeReject(
            body.code,
            msg,
            body.data !== undefined ? body.data : null
          )
        )
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || '网络异常'
        uni.showToast({ title: msg, icon: 'none' })
        reject(normalizeReject(-1, msg, null))
      }
    })
  })
}

export function get(url, params = {}, config = {}) {
  return request({ url, method: 'GET', data: params, ...config })
}

export function post(url, data = {}, config = {}) {
  return request({ url, method: 'POST', data, ...config })
}
