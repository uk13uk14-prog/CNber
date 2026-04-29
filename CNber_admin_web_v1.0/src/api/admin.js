import { http } from './request'

export function login(phone, password) {
  return http.post('/auth/login', { phone, password })
}

export function fetchStats() {
  return http.get('/admin/stats')
}

export function fetchOrders(params) {
  return http.get('/admin/orders', { params })
}

export function quoteOrder(orderId, amount) {
  return http.post('/order/quote', { orderId, amount })
}

export function autoQuoteOrder(orderId) {
  return http.post('/order/auto-quote', { orderId })
}

export function fetchPricingRules() {
  return http.get('/admin/pricing-rules')
}

export function updatePricingRule(id, payload) {
  return http.put(`/admin/pricing-rules/${id}`, payload)
}

export function importPricingRules(rules) {
  return http.post('/admin/pricing-rules/import', { rules })
}

export function importPriceMatrix(text) {
  return http.post('/admin/price-matrix/import', { text })
}

export function fetchOrderById(id) {
  return http.get(`/admin/orders/${id}`)
}

export function assignDriver(orderId, driverUserId) {
  return http.patch(`/admin/orders/${orderId}/assign-driver`, { driverId: driverUserId })
}

export function unassignDriver(orderId) {
  return http.patch(`/admin/orders/${orderId}/unassign-driver`)
}

export function postOrderNote(orderId, content) {
  return http.post(`/admin/orders/${orderId}/notes`, { content })
}

/** 管理端修改主状态（如 assigned → pending 撤销指派） */
export function postAdminOrderStatus(orderId, status) {
  return http.post(`/admin/orders/${orderId}/status`, { status })
}

export function fetchDriversForDispatch(orderId) {
  return http.get('/admin/drivers/for-dispatch', {
    params: orderId ? { orderId } : {}
  })
}

export function fetchDrivers(params) {
  return http.get('/admin/drivers', { params })
}

export function fetchAvailableDrivers(params = {}) {
  return http.get('/admin/drivers/available', { params })
}

export function putStaffDriverRelation(body) {
  return http.put('/admin/staff-driver-relations', body)
}
