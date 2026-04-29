import { request } from './request.js'

/**
 * 创建网约车订单（后端字段：pickup、destination）
 * @returns {Promise<any>} 默认 resolve 为 data（含 order），与 request 封装一致
 */
export function createRideOrder(pickup, destination, serviceType = 'ride', extra = {}) {
  return request({
    url: '/order/create',
    method: 'POST',
    data: {
      pickup: String(pickup || '').trim(),
      destination: String(destination || '').trim(),
      serviceType,
      ...extra
    }
  })
}

/** 当前用户订单列表（乘客：本人全部；含各状态） */
export function fetchOrderList() {
  return request({
    url: '/order/list',
    method: 'GET'
  })
}

/** 单条订单详情（乘客：仅本人单） */
export function fetchOrderDetail(orderId) {
  const id = String(orderId || '').trim()
  return request({
    url: `/order/detail/${encodeURIComponent(id)}`,
    method: 'GET'
  })
}

export function confirmOrderPrice(orderId) {
  return request({
    url: '/order/confirm-price',
    method: 'POST',
    data: { orderId: String(orderId || '').trim() }
  })
}

export function payOrderMock(orderId) {
  return request({
    url: '/order/pay',
    method: 'POST',
    data: { orderId: String(orderId || '').trim() }
  })
}

export function cancelPassengerOrder(orderId) {
  return request({
    url: '/order/passenger-cancel',
    method: 'POST',
    data: { orderId: String(orderId || '').trim() }
  })
}

/**
 * 乘客评价订单：后端路由尚未实现时为 false，禁止冒充成功提交。
 * 接入后改为 true，并实现 POST /order/rating（或约定路径），与 submitOrderRating 对齐。
 */
export const ORDER_RATING_API_ENABLED = false

/**
 * 提交订单评价（占位：仅当 ORDER_RATING_API_ENABLED 为 true 时发请求）
 * @param {{ orderId: string, stars: number, tags?: string[], comment?: string }} payload
 */
export function submitOrderRating(payload) {
  if (!ORDER_RATING_API_ENABLED) {
    return Promise.reject(new Error('RATING_API_NOT_IMPLEMENTED'))
  }
  return request({
    url: '/order/rating',
    method: 'POST',
    data: payload
  })
}
