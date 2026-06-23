import { BASE_URL, LOGIN_PATH } from '@/config/api'
import { TOKEN_KEY } from '@/config/authConstants'

function unwrapBody(res) {
  const body = res.data
  if (body && typeof body.code === 'number' && body.code !== 0) {
    const err = new Error(body.message || '请求失败')
    err.code = body.code
    throw err
  }
  return body?.data !== undefined ? body.data : body
}

export function request(options) {
  const token = uni.getStorageSync(TOKEN_KEY)
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {})
      },
      success(res) {
        if (res.statusCode === 401) {
          uni.removeStorageSync(TOKEN_KEY)
          uni.reLaunch({ url: LOGIN_PATH })
          reject(new Error('登录已失效'))
          return
        }
        if (res.statusCode >= 400) {
          const msg = res.data?.message || `HTTP ${res.statusCode}`
          reject(new Error(msg))
          return
        }
        try {
          resolve(unwrapBody(res))
        } catch (e) {
          reject(e)
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误'))
      }
    })
  })
}

export const http = {
  get(url, params) {
    return request({ url, method: 'GET', data: params })
  },
  post(url, data) {
    return request({ url, method: 'POST', data })
  },
  patch(url, data) {
    return request({ url, method: 'PATCH', data })
  },
  put(url, data) {
    return request({ url, method: 'PUT', data })
  }
}
