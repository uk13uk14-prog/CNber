import { http } from './request'
import { TOKEN_KEY } from '@/config/authConstants'

export function login(phone, password) {
  return http.post('/auth/login', { phone, password })
}

export function fetchStats() {
  return http.get('/admin/dashboard')
}

export function fetchOrders(params) {
  return http.get('/admin/orders', { params })
}

export function softDeleteOrder(orderId, payload) {
  return http.patch(`/admin/orders/${orderId}/delete`, payload)
}

export function quoteOrder(orderId, amount) {
  return http.post('/order/quote', { orderId, amount, amountCny: amount, currency: 'CNY' })
}

export function autoQuoteOrder(orderId) {
  return http.post('/order/auto-quote', { orderId })
}

export function fetchPricingRules() {
  return http.get('/admin/pricing-rules')
}

export function fetchExchangeRate() {
  return http.get('/admin/settings/exchange-rate')
}

export function updateExchangeRate(rate) {
  return http.put('/admin/settings/exchange-rate', { rate })
}

export function fetchFixedPricing() {
  return http.get('/admin/pricing/fixed')
}

export function updateFixedPricing(serviceType, payload) {
  return http.put(`/admin/pricing/fixed/${serviceType}`, payload)
}

export function fetchRoutePricing(params) {
  return http.get('/admin/pricing/routes', { params })
}

export function createRoutePricing(payload) {
  return http.post('/admin/pricing/routes', payload)
}

export function updateRoutePricing(id, payload) {
  return http.put(`/admin/pricing/routes/${id}`, payload)
}

export function patchRoutePricing(id, payload) {
  return http.patch(`/admin/pricing/routes/${id}`, payload)
}

export function fetchServiceTypeConfigs(params) {
  return http.get('/admin/pricing/service-types', { params })
}

export function createServiceTypeConfig(payload) {
  return http.post('/admin/pricing/service-types', payload)
}

export function updateServiceTypeConfig(id, payload) {
  return http.put(`/admin/pricing/service-types/${id}`, payload)
}

export function fetchVehicleClassConfigs(params) {
  return http.get('/admin/pricing/vehicle-classes', { params })
}

export function createVehicleClassConfig(payload) {
  return http.post('/admin/pricing/vehicle-classes', payload)
}

export function updateVehicleClassConfig(id, payload) {
  return http.put(`/admin/pricing/vehicle-classes/${id}`, payload)
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

export function fetchAdminNotifications(params) {
  return http.get('/admin/notifications', { params })
}

export function markAdminNotificationRead(id) {
  return http.patch(`/admin/notifications/${id}/read`)
}

export function resolveAdminNotification(id) {
  return http.patch(`/admin/notifications/${id}/resolve`)
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

export function markOrderDepositPaid(orderId) {
  return http.post(`/admin/orders/${orderId}/pay-deposit`)
}

export function markOrderRemainingPaid(orderId) {
  return http.post(`/admin/orders/${orderId}/pay-remaining`)
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

export function fetchPaymentAccounts() {
  return http.get('/admin/payment-accounts')
}

export function fetchPaymentConfig() {
  return http.get('/admin/payment-config')
}

export function putPaymentConfig(body) {
  return http.put('/admin/payment-config', body)
}

export function uploadPaymentQr(type, imageBase64) {
  return http.post('/admin/payment-config/qr', { type, imageBase64 })
}

export function createPaymentAccount(body) {
  return http.post('/admin/payment-accounts', body)
}

export function updatePaymentAccount(id, body) {
  return http.put(`/admin/payment-accounts/${id}`, body)
}

export function patchPaymentAccount(id, body) {
  return http.patch(`/admin/payment-accounts/${id}`, body)
}

export function deletePaymentAccount(id) {
  return http.delete(`/admin/payment-accounts/${id}`)
}

export function confirmOrderDeposit(orderId, body = {}) {
  return http.patch(`/admin/orders/${orderId}/payment/deposit/confirm`, body)
}

/** @deprecated 请使用 confirmOrderDeposit */
export function confirmOrderDepositPost(orderId) {
  return http.post(`/admin/orders/${orderId}/deposit/confirm`)
}

export function rejectOrderDeposit(orderId, body = {}) {
  return http.post(`/admin/orders/${orderId}/deposit/reject`, body)
}

export function requestOrderBalance(orderId) {
  return http.post(`/admin/orders/${orderId}/balance/request`)
}

export function confirmOrderBalance(orderId, body = {}) {
  return http.patch(`/admin/orders/${orderId}/payment/balance/confirm`, body)
}

export function rejectOrderBalance(orderId, body = {}) {
  return http.post(`/admin/orders/${orderId}/balance/reject`, body)
}

export function confirmDriverSettlement(orderId, body = {}) {
  return http.post(`/admin/orders/${orderId}/driver-settlement/confirm`, body)
}

export function fetchCustomers(params) {
  return http.get('/admin/customers', { params })
}

export function fetchCustomerOrders(customerId, params) {
  return http.get(`/admin/customers/${customerId}/orders`, { params })
}

export function patchCustomerStatus(customerId, status) {
  return http.patch(`/admin/customers/${customerId}/status`, { status })
}

export function fetchFinanceSummary() {
  return http.get('/admin/finance/summary')
}

export function fetchFinanceTransactions(params) {
  return http.get('/admin/finance/transactions', { params })
}

export function fetchDriverSettlements(params) {
  return http.get('/admin/finance/driver-settlements', { params })
}

export function fetchDriverSettlementBatches(params) {
  return http.get('/admin/driver-settlements', { params })
}

export function generateDriverSettlementBatches(body) {
  return http.post('/admin/driver-settlements/generate', body)
}

export function fetchDriverSettlementBatch(id) {
  return http.get(`/admin/driver-settlements/${id}`)
}

export function patchDriverSettlementStatus(id, body) {
  return http.patch(`/admin/driver-settlements/${id}/status`, body)
}

export function fetchPaymentReviews(params) {
  return http.get('/admin/payment-reviews', { params })
}

export function fetchFinanceReconciliation(params) {
  return http.get('/admin/finance/reconciliation', { params })
}

export function fetchOrderFinance(orderId) {
  return http.get(`/admin/orders/${orderId}/finance`)
}

export function adminCancelOrder(orderId, body) {
  return http.post(`/admin/orders/${orderId}/cancel`, body)
}

export function adminChangePrice(orderId, body) {
  return http.post(`/admin/orders/${orderId}/change-price`, body)
}

export function adminRefundOrder(orderId, body) {
  return http.post(`/admin/orders/${orderId}/refund`, body)
}

export function adminDisputeOrder(orderId, body) {
  return http.post(`/admin/orders/${orderId}/dispute`, body)
}

export function adminSetException(orderId, body) {
  return http.post(`/admin/orders/${orderId}/exception`, body)
}

export function adminCloseOrder(orderId, body = {}) {
  return http.post(`/admin/orders/${orderId}/close`, body)
}

export function patchOrderSop(orderId, body) {
  return http.patch(`/admin/orders/${orderId}/sop`, body)
}

export function postOrderInternalNote(orderId, content) {
  return http.post(`/admin/orders/${orderId}/sop/internal-note`, { content })
}

export function postOrderCustomerLog(orderId, content) {
  return http.post(`/admin/orders/${orderId}/sop/customer-log`, { content })
}

export function postOrderDriverLog(orderId, content) {
  return http.post(`/admin/orders/${orderId}/sop/driver-log`, { content })
}

export function fetchDriverOnboarding(params) {
  return http.get('/admin/drivers/onboarding', { params })
}

export function patchDriverVerification(userId, body) {
  return http.patch(`/admin/drivers/${userId}/verification`, body)
}

export function patchDriverActive(userId, body) {
  return http.patch(`/admin/drivers/${userId}/active`, body)
}

export function fetchCustomerProfiles(params) {
  return http.get('/admin/profiles/customers', { params })
}

export function fetchCustomerProfile(id) {
  return http.get(`/admin/profiles/customers/${id}`)
}

export function patchCustomerProfile(id, body) {
  return http.patch(`/admin/profiles/customers/${id}`, body)
}

export function generateCustomerAiSummary(id) {
  return http.post(`/admin/profiles/customers/${id}/ai-summary`)
}

export function fetchDriverProfiles(params) {
  return http.get('/admin/profiles/drivers', { params })
}

export function fetchDriverProfile(id) {
  return http.get(`/admin/profiles/drivers/${id}`)
}

export function patchDriverProfile(id, body) {
  return http.patch(`/admin/profiles/drivers/${id}`, body)
}

export function generateDriverAiSummary(id) {
  return http.post(`/admin/profiles/drivers/${id}/ai-summary`)
}

export function fetchStaff(params) {
  return http.get('/admin/staff', { params })
}

export function createStaff(body) {
  return http.post('/admin/staff', body)
}

export function patchStaffStatus(id, status) {
  return http.patch(`/admin/staff/${id}/status`, { status })
}

export function resetStaffPassword(id, password) {
  return http.post(`/admin/staff/${id}/reset-password`, { password })
}

export function fetchStaffRoles() {
  return http.get('/admin/staff/roles')
}

export function fetchRolePermissions() {
  return http.get('/admin/role-permissions')
}

export function updateRolePermissions(role, permissions) {
  return http.put(`/admin/role-permissions/${role}`, { permissions })
}

export function resetRolePermissions(role) {
  return http.post(`/admin/role-permissions/${role}/reset`)
}

export function fetchMyPermissions() {
  return http.get('/admin/me/permissions')
}

export function fetchSystemConfig() {
  return http.get('/admin/system-config')
}

export function updateSystemConfig(body) {
  return http.put('/admin/system-config', body)
}

export function fetchCatalogServiceTypes() {
  return http.get('/catalog/service-types')
}

export function fetchCatalogVehicleClasses() {
  return http.get('/catalog/vehicle-classes')
}

export function fetchCoupons(params) {
  return http.get('/admin/coupons', { params })
}

export function fetchCoupon(id) {
  return http.get(`/admin/coupons/${id}`)
}

export function createCoupon(body) {
  return http.post('/admin/coupons', body)
}

export function updateCoupon(id, body) {
  return http.put(`/admin/coupons/${id}`, body)
}

export function patchCouponStatus(id, enabled) {
  return http.patch(`/admin/coupons/${id}/status`, { enabled })
}

export function fetchCampaigns(params) {
  return http.get('/admin/campaigns', { params })
}

export function fetchCampaign(id) {
  return http.get(`/admin/campaigns/${id}`)
}

export function createCampaign(body) {
  return http.post('/admin/campaigns', body)
}

export function updateCampaign(id, body) {
  return http.put(`/admin/campaigns/${id}`, body)
}

export function patchCampaignStatus(id, enabled) {
  return http.patch(`/admin/campaigns/${id}/status`, { enabled })
}

export function fetchSupportTickets(params) {
  return http.get('/admin/support-tickets', { params })
}

export function fetchSupportTicket(id) {
  return http.get(`/admin/support-tickets/${id}`)
}

export function createSupportTicket(body) {
  return http.post('/admin/support-tickets', body)
}

export function patchSupportTicket(id, body) {
  return http.patch(`/admin/support-tickets/${id}`, body)
}

export function patchSupportTicketStatus(id, body) {
  return http.patch(`/admin/support-tickets/${id}/status`, body)
}

export function addSupportTicketComment(id, content) {
  return http.post(`/admin/support-tickets/${id}/comment`, { content })
}

export function fetchCrmAudiences() {
  return http.get('/admin/crm/audiences')
}

export function createCrmAudience(body) {
  return http.post('/admin/crm/audiences', body)
}

export function fetchCrmAudience(id) {
  return http.get(`/admin/crm/audiences/${id}`)
}

export function refreshCrmAudience(id) {
  return http.post(`/admin/crm/audiences/${id}/refresh`)
}

export async function exportCrmAudience(id) {
  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${baseURL}/admin/crm/audiences/${id}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  if (!res.ok) {
    let msg = '导出失败'
    try {
      const j = await res.json()
      msg = j.message || msg
    } catch {
      /* csv or empty */
    }
    throw new Error(msg)
  }
  const blob = await res.blob()
  const cd = res.headers.get('content-disposition') || ''
  const match = cd.match(/filename="?([^";]+)"?/)
  const filename = match ? match[1] : `crm_audience_${id}.csv`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return filename
}

export function fetchCrmMarketingLogs(params) {
  return http.get('/admin/crm/marketing-logs', { params })
}

export function createCrmMarketingLog(body) {
  return http.post('/admin/crm/marketing-logs', body)
}

export function fetchTrialDashboard() {
  return http.get('/admin/trial-dashboard')
}

export function fetchAuditLogs(params) {
  return http.get('/admin/audit-logs', { params })
}

export function fetchBackupStatus() {
  return http.get('/admin/backup/status')
}

export function runBackup() {
  return http.post('/admin/backup/run')
}

export function fetchSystemHealth() {
  return http.get('/admin/system-health')
}

export function fetchOperationsDashboardOverview() {
  return http.get('/admin/dashboard/overview')
}

export function fetchSystemHealthMetrics() {
  return http.get('/admin/system/health')
}

export function fetchJobQueueStats() {
  return http.get('/admin/jobs/stats')
}

export function fetchRecentJobs(params = {}) {
  return http.get('/admin/jobs/recent', { params })
}
