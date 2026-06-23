import { request } from './request.js'
import { BASE_URL } from '../config/api.js'
import { readImageAsDataUrl } from './paymentProofRead.js'

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

export function payOrderMock(orderId, paymentType) {
  const data = { orderId: String(orderId || '').trim() }
  if (paymentType) data.paymentType = paymentType
  return request({
    url: '/order/pay',
    method: 'POST',
    data
  })
}

export function cancelPassengerOrder(orderId) {
  return request({
    url: '/order/passenger-cancel',
    method: 'POST',
    data: { orderId: String(orderId || '').trim() }
  })
}

/** 平台收款账户（公开接口，仅 enabled=true） */
export function fetchPaymentAccounts() {
  return request({
    url: '/payment/accounts',
    method: 'GET'
  })
}

export function apiOrigin() {
  return BASE_URL.replace(/\/api\/?$/i, '')
}

export function resolveProofUrl(urlOrPath) {
  const u = String(urlOrPath || '').trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith('/')) return `${apiOrigin()}${u}`
  return u
}

/** 上传付款截图，返回 { url, path }
 *  body.imageBase64 — JSON base64（H5/兼容）
 *  body.filePath — chooseImage 临时路径（app-plus 用 plus.io 转 base64 后上传）
 */
export async function uploadPaymentProof(orderId, body = {}) {
  const id = String(orderId || '').trim()
  let payload = { ...body }
  if (payload.filePath && !payload.imageBase64) {
    payload = { imageBase64: await readImageAsDataUrl(payload.filePath) }
  }
  delete payload.filePath
  const data = await request({
    url: `/order/${encodeURIComponent(id)}/payment-proof/upload`,
    method: 'POST',
    data: payload
  })
  if (data && data.url) data.url = resolveProofUrl(data.url)
  if (data && data.path) data.path = resolveProofUrl(data.path)
  return data
}

export function submitOrderDeposit(orderId, body) {
  const id = String(orderId || '').trim()
  const payload = {
    payerName: body.payerName,
    paidAmount: body.paidAmount,
    transactionRef: body.transactionRef,
    proofImage: body.proofImage || '',
    note: body.note || body.remark,
    remark: body.note || body.remark,
    paymentAccountId: body.paymentAccountId,
    paymentMethod: body.paymentMethod,
    method: body.paymentMethod || body.method
  }
  if (body.couponCode) payload.couponCode = String(body.couponCode).trim().toUpperCase()
  return request({
    url: `/order/${encodeURIComponent(id)}/deposit/submit`,
    method: 'POST',
    data: payload
  })
}

/** 公开校验优惠码（V1 不扣库存） */
export function validatePublicCoupon(params) {
  return request({
    url: '/public/coupons/validate',
    method: 'GET',
    data: params,
    showErrorToast: false
  })
}

export function submitOrderBalance(orderId, body) {
  const id = String(orderId || '').trim()
  const payload = {
    payerName: body.payerName,
    paidAmount: body.paidAmount,
    transactionRef: body.transactionRef,
    proofImage: body.proofImage || '',
    note: body.note || body.remark,
    remark: body.note || body.remark,
    paymentAccountId: body.paymentAccountId,
    paymentMethod: body.paymentMethod,
    method: body.paymentMethod || body.method
  }
  return request({
    url: `/order/${encodeURIComponent(id)}/balance/submit`,
    method: 'POST',
    data: payload
  })
}

export const ORDER_RATING_API_ENABLED = true

export const RATING_TAG_OPTIONS = [
  '准时',
  '服务好',
  '车辆干净',
  '驾驶平稳',
  '沟通顺畅',
  '推荐',
  '迟到',
  '车辆不符',
  '服务一般'
]

export function fetchOrderRating(orderId) {
  const id = String(orderId || '').trim()
  return request({
    url: `/order/${encodeURIComponent(id)}/rating`,
    method: 'GET'
  })
}

/**
 * 提交订单评价
 * @param {{ orderId: string, driverStars: number, serviceStars: number, tags?: string[], comment?: string }} payload
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
