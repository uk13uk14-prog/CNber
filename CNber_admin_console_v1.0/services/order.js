/**
 * 接口层：订单（复用 GET /order/list；详情/指派/备注走 /admin/*）
 */
import { get, post } from '../utils/request.js'

/**
 * @param {Record<string, string|number|undefined>} query
 */
export function fetchOrderList(query = {}) {
  return get('order/list', query)
}

export function fetchOrderDetail(orderId) {
  return get(`admin/orders/${orderId}`)
}

export function assignOrderDriver(orderId, driverUserId) {
  return post(`admin/orders/${orderId}/assign`, { driverUserId })
}

export function addOrderFollowUp(orderId, content) {
  return post(`admin/orders/${orderId}/notes`, { content })
}

export function updateOrderMainStatus(orderId, status) {
  return post(`admin/orders/${orderId}/status`, { status })
}
