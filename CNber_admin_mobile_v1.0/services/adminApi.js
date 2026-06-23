import { http } from '@/utils/request'

export function login(phone, password) {
  return http.post('/auth/login', { phone, password })
}

export function fetchMyPermissions() {
  return http.get('/admin/me/permissions')
}

export function fetchMobileDashboard() {
  return http.get('/admin/mobile/dashboard')
}

/** @alias fetchAdminOrders */
export function fetchAdminOrders(params) {
  return http.get('/admin/orders', params)
}

export function fetchOrders(params) {
  return fetchAdminOrders(params)
}

/** @alias fetchOrderDetail */
export function fetchOrderDetail(id) {
  return http.get(`/admin/orders/${id}`)
}

export function fetchOrderById(id) {
  return fetchOrderDetail(id)
}

/** @alias fetchDispatchDrivers */
export function fetchDispatchDrivers(orderId) {
  return http.get('/admin/drivers/for-dispatch', orderId ? { orderId } : {})
}

export function fetchDriversForDispatch(orderId) {
  return fetchDispatchDrivers(orderId)
}

export function fetchAvailableDrivers(params = {}) {
  return http.get('/admin/drivers/available', params)
}

export function assignDriver(orderId, driverUserId) {
  return http.patch(`/admin/orders/${orderId}/assign-driver`, { driverId: driverUserId })
}

export function unassignDriver(orderId) {
  return http.patch(`/admin/orders/${orderId}/unassign-driver`)
}

export function confirmOrderDeposit(orderId, body = {}) {
  return http.patch(`/admin/orders/${orderId}/payment/deposit/confirm`, body)
}

export function fetchPaymentReviews(params) {
  return http.get('/admin/payment-reviews', params)
}

export function fetchSupportTickets(params) {
  return http.get('/admin/support-tickets', params)
}

/** @alias fetchSupportTicketDetail */
export function fetchSupportTicketDetail(id) {
  return http.get(`/admin/support-tickets/${id}`)
}

export function fetchSupportTicket(id) {
  return fetchSupportTicketDetail(id)
}

export function updateSupportTicketStatus(id, body) {
  return http.patch(`/admin/support-tickets/${id}/status`, body)
}

export function patchSupportTicketStatus(id, body) {
  return updateSupportTicketStatus(id, body)
}

export function addSupportTicketComment(id, content) {
  return http.post(`/admin/support-tickets/${id}/comment`, { content })
}

export function createSupportTicket(body) {
  return http.post('/admin/support-tickets', body)
}
