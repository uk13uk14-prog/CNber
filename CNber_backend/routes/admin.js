const express = require('express')
const router = express.Router()
const asyncHandler = require('../utils/asyncHandler')
const adminController = require('../controllers/adminController')
const paymentAccountController = require('../controllers/paymentAccountController')
const paymentConfigController = require('../controllers/paymentConfigController')
const orderPaymentController = require('../controllers/orderPaymentController')
const financeController = require('../controllers/financeController')
const p0OperationsController = require('../controllers/p0OperationsController')
const driverOnboardingController = require('../controllers/driverOnboardingController')
const settingsController = require('../controllers/settingsController')
const fixedPricingController = require('../controllers/fixedPricingController')
const routePricingController = require('../controllers/routePricingController')
const pricingConfigController = require('../controllers/pricingConfigController')
const profileController = require('../controllers/profileController')
const crmController = require('../controllers/crmController')
const staffController = require('../controllers/staffController')
const systemConfigController = require('../controllers/systemConfigController')
const couponController = require('../controllers/couponController')
const campaignController = require('../controllers/campaignController')
const driverSettlementController = require('../controllers/driverSettlementController')
const supportTicketController = require('../controllers/supportTicketController')
const rolePermissionController = require('../controllers/rolePermissionController')
const operationsPackController = require('../controllers/operationsPackController')
const operationsDashboardController = require('../controllers/operationsDashboardController')
const jobQueueController = require('../controllers/jobQueueController')
const { requireStaffRoles, requirePermission } = require('../middlewares/staffAccess')
const adminNotificationController = require('../controllers/adminNotificationController')

const P = requirePermission

const ALL = requireStaffRoles('admin', 'operator', 'finance', 'support', 'dispatcher')
const ORDERS = requireStaffRoles('admin', 'operator', 'dispatcher')
const FINANCE = requireStaffRoles('admin', 'finance')
const CUSTOMERS = requireStaffRoles('admin', 'operator', 'support')
const CRM = requireStaffRoles('admin', 'operator', 'support')
const SUPPORT = requireStaffRoles('admin', 'support', 'operator')
const SUPPORT_READ = requireStaffRoles('admin', 'support', 'operator', 'finance')
const OPS = requireStaffRoles('admin')
const OPS_READ = requireStaffRoles('admin', 'operator')
const ADMIN_ONLY = requireStaffRoles('admin')

/** 角色权限矩阵 */
router.get('/me/permissions', ALL, asyncHandler(rolePermissionController.getMyPermissions))
router.get('/role-permissions', ADMIN_ONLY, asyncHandler(rolePermissionController.listRolePermissions))
router.put('/role-permissions/:role', ADMIN_ONLY, asyncHandler(rolePermissionController.putRolePermissions))
router.post(
  '/role-permissions/:role/reset',
  ADMIN_ONLY,
  asyncHandler(rolePermissionController.resetRolePermissionTemplate)
)

/** 员工管理 */
router.get('/staff/roles', P('staff', 'view'), asyncHandler(staffController.listStaffRoles))
router.get('/staff', P('staff', 'view'), asyncHandler(staffController.listStaff))
router.post('/staff', P('staff', 'create'), asyncHandler(staffController.createStaff))
router.patch('/staff/:id/status', P('staff', 'delete'), asyncHandler(staffController.patchStaffStatus))
router.post('/staff/:id/reset-password', P('staff', 'update'), asyncHandler(staffController.resetStaffPassword))

router.get('/system-config', P('system_settings', 'view'), asyncHandler(systemConfigController.getAdminSystemConfig))
router.put('/system-config', P('system_settings', 'update'), asyncHandler(systemConfigController.putAdminSystemConfig))

router.get('/dashboard', ALL, asyncHandler(adminController.getDashboard))
router.get('/dashboard/overview', P('system_health', 'view'), asyncHandler(operationsDashboardController.getDashboardOverview))
router.get('/mobile/dashboard', ALL, asyncHandler(adminController.getMobileDashboard))
router.get('/trial-dashboard', P('trial_operations', 'view'), asyncHandler(operationsPackController.getTrialDashboard))
router.get('/audit-logs', P('audit_logs', 'view'), asyncHandler(operationsPackController.listAuditLogs))
router.get('/backup/status', P('backup_center', 'view'), asyncHandler(operationsPackController.getBackupStatus))
router.post('/backup/run', ADMIN_ONLY, asyncHandler(operationsPackController.runBackup))
router.get('/system-health', P('system_health', 'view'), asyncHandler(operationsPackController.getSystemHealth))
router.get('/system/health', P('system_health', 'view'), asyncHandler(operationsDashboardController.getSystemHealth))
router.get('/stats', ALL, asyncHandler(adminController.getStats))

router.get('/settings/exchange-rate', OPS, asyncHandler(settingsController.getExchangeRate))
router.put('/settings/exchange-rate', OPS, asyncHandler(settingsController.putExchangeRate))

router.get('/payment-reviews', FINANCE, asyncHandler(p0OperationsController.listPaymentReviews))
router.get('/finance/reconciliation', FINANCE, asyncHandler(p0OperationsController.listReconciliation))
router.get('/finance/summary', FINANCE, asyncHandler(financeController.getFinanceSummary))
router.get('/finance/transactions', FINANCE, asyncHandler(financeController.listFinanceTransactions))
router.get(
  '/finance/driver-settlements',
  FINANCE,
  asyncHandler(financeController.listDriverSettlements)
)

router.get(
  '/driver-settlements',
  P('driver_settlements', 'view'),
  asyncHandler(driverSettlementController.listDriverSettlementBatches)
)
router.post(
  '/driver-settlements/generate',
  P('driver_settlements', 'create'),
  asyncHandler(driverSettlementController.generateDriverSettlementBatches)
)
router.get(
  '/driver-settlements/:id',
  P('driver_settlements', 'view'),
  asyncHandler(driverSettlementController.getDriverSettlementBatch)
)
router.patch(
  '/driver-settlements/:id/status',
  P('driver_settlements', 'approve'),
  asyncHandler(driverSettlementController.patchDriverSettlementStatus)
)

router.get('/pricing-rules', OPS, asyncHandler(adminController.listPricingRules))
router.post('/pricing-rules/import', OPS, asyncHandler(adminController.importPricingRules))
router.post('/price-matrix/import', OPS, asyncHandler(adminController.importPriceMatrix))
router.put('/pricing-rules/:id', OPS, asyncHandler(adminController.updatePricingRule))
router.get('/pricing/fixed', OPS, asyncHandler(fixedPricingController.listFixedPricing))
router.put('/pricing/fixed/:serviceType', OPS, asyncHandler(fixedPricingController.updateFixedPricing))
router.get('/pricing/routes', OPS, asyncHandler(routePricingController.listRoutePricing))
router.post('/pricing/routes', OPS, asyncHandler(routePricingController.createRoutePricing))
router.put('/pricing/routes/:id', OPS, asyncHandler(routePricingController.updateRoutePricing))
router.patch('/pricing/routes/:id', OPS, asyncHandler(routePricingController.patchRoutePricing))
router.get('/pricing/service-types', OPS, asyncHandler(pricingConfigController.listServiceTypes))
router.post('/pricing/service-types', OPS, asyncHandler(pricingConfigController.createServiceType))
router.put('/pricing/service-types/:id', OPS, asyncHandler(pricingConfigController.updateServiceType))
router.get('/pricing/vehicle-classes', OPS, asyncHandler(pricingConfigController.listVehicleClasses))
router.post('/pricing/vehicle-classes', OPS, asyncHandler(pricingConfigController.createVehicleClass))
router.put('/pricing/vehicle-classes/:id', OPS, asyncHandler(pricingConfigController.updateVehicleClass))

router.get('/coupons', P('coupons', 'view'), asyncHandler(couponController.listCoupons))
router.post('/coupons', P('coupons', 'create'), asyncHandler(couponController.createCoupon))
router.get('/coupons/:id', P('coupons', 'view'), asyncHandler(couponController.getCoupon))
router.put('/coupons/:id', P('coupons', 'update'), asyncHandler(couponController.updateCoupon))
router.patch('/coupons/:id/status', P('coupons', 'delete'), asyncHandler(couponController.patchCouponStatus))

router.get('/campaigns', P('campaigns', 'view'), asyncHandler(campaignController.listCampaigns))
router.post('/campaigns', P('campaigns', 'create'), asyncHandler(campaignController.createCampaign))
router.get('/campaigns/:id', P('campaigns', 'view'), asyncHandler(campaignController.getCampaign))
router.put('/campaigns/:id', P('campaigns', 'update'), asyncHandler(campaignController.updateCampaign))
router.patch('/campaigns/:id/status', P('campaigns', 'delete'), asyncHandler(campaignController.patchCampaignStatus))

router.get('/payment-config', OPS, asyncHandler(paymentConfigController.getAdminPaymentConfig))
router.put('/payment-config', OPS, asyncHandler(paymentConfigController.putAdminPaymentConfig))
router.post('/payment-config/qr', OPS, asyncHandler(paymentConfigController.uploadPaymentQr))
router.get('/payment-accounts', OPS, asyncHandler(paymentAccountController.listPaymentAccounts))
router.post('/payment-accounts', OPS, asyncHandler(paymentAccountController.createPaymentAccount))
router.put('/payment-accounts/:id', OPS, asyncHandler(paymentAccountController.updatePaymentAccount))
router.patch('/payment-accounts/:id', OPS, asyncHandler(paymentAccountController.patchPaymentAccount))
router.delete('/payment-accounts/:id', OPS, asyncHandler(paymentAccountController.deletePaymentAccount))

router.get('/notifications', ALL, asyncHandler(adminNotificationController.listAdminNotifications))
router.patch(
  '/notifications/:id/read',
  ALL,
  asyncHandler(adminNotificationController.markAdminNotificationRead)
)
router.patch(
  '/notifications/:id/resolve',
  ALL,
  asyncHandler(adminNotificationController.resolveAdminNotification)
)

router.get('/orders', ORDERS, asyncHandler(adminController.listAdminOrders))
router.patch('/orders/:id/delete', ORDERS, asyncHandler(adminController.softDeleteOrder))
router.get('/orders/:id', ORDERS, asyncHandler(adminController.getOrderDetail))
router.post('/orders/:id/cancel', ORDERS, asyncHandler(p0OperationsController.adminCancelOrder))
router.post('/orders/:id/change-price', ORDERS, asyncHandler(p0OperationsController.adminChangePrice))
router.post('/orders/:id/refund', ORDERS, asyncHandler(p0OperationsController.adminRefund))
router.post('/orders/:id/dispute', ORDERS, asyncHandler(p0OperationsController.adminDispute))
router.post('/orders/:id/exception', ORDERS, asyncHandler(p0OperationsController.adminSetException))
router.post('/orders/:id/close', ORDERS, asyncHandler(p0OperationsController.closeOrder))
router.patch('/orders/:id/sop', ORDERS, asyncHandler(p0OperationsController.updateSop))
router.post('/orders/:id/sop/internal-note', ORDERS, asyncHandler(p0OperationsController.addInternalNote))
router.post('/orders/:id/sop/customer-log', ORDERS, asyncHandler(p0OperationsController.addCustomerLog))
router.post('/orders/:id/sop/driver-log', ORDERS, asyncHandler(p0OperationsController.addDriverLog))
router.post('/orders/:id/assign', ORDERS, asyncHandler(adminController.assignDriver))
router.post('/orders/:id/assign-driver', ORDERS, asyncHandler(adminController.assignDriver))
router.patch('/orders/:id/assign-driver', ORDERS, asyncHandler(adminController.assignDriver))
router.patch('/orders/:id/unassign-driver', ORDERS, asyncHandler(adminController.unassignDriver))
router.post('/orders/:id/notes', ORDERS, asyncHandler(adminController.addFollowUpNote))
router.post('/orders/:id/status', ORDERS, asyncHandler(adminController.updateOrderStatus))
router.post('/orders/:id/pay-deposit', ORDERS, asyncHandler(adminController.markDepositPaid))
router.post('/orders/:id/pay-remaining', ORDERS, asyncHandler(adminController.markRemainingPaid))

router.get('/orders/:id/finance', FINANCE, asyncHandler(p0OperationsController.getOrderFinance))
router.patch('/orders/:id/payment/deposit/confirm', FINANCE, asyncHandler(orderPaymentController.adminConfirmDeposit))
router.patch('/orders/:id/payment/balance/confirm', FINANCE, asyncHandler(orderPaymentController.adminConfirmBalance))
router.post('/orders/:id/deposit/confirm', FINANCE, asyncHandler(orderPaymentController.adminConfirmDeposit))
router.post('/orders/:id/deposit/reject', FINANCE, asyncHandler(orderPaymentController.adminRejectDeposit))
router.post('/orders/:id/balance/request', FINANCE, asyncHandler(orderPaymentController.adminRequestBalance))
router.post('/orders/:id/balance/confirm', FINANCE, asyncHandler(orderPaymentController.adminConfirmBalance))
router.post('/orders/:id/balance/reject', FINANCE, asyncHandler(orderPaymentController.adminRejectBalance))
router.post(
  '/orders/:id/driver-settlement/confirm',
  FINANCE,
  asyncHandler(orderPaymentController.adminConfirmDriverSettlement)
)

router.get('/drivers/onboarding', ORDERS, asyncHandler(driverOnboardingController.listOnboarding))
router.get('/drivers/for-dispatch', ORDERS, asyncHandler(adminController.getDriversForDispatch))
router.get('/drivers/available', ORDERS, asyncHandler(adminController.listAvailableDrivers))
router.get('/drivers', ORDERS, asyncHandler(adminController.listDrivers))
router.get('/drivers/:userId/onboarding', ORDERS, asyncHandler(driverOnboardingController.getOnboarding))
router.patch('/drivers/:userId/verification', ORDERS, asyncHandler(driverOnboardingController.patchVerification))
router.patch('/drivers/:userId/active', ORDERS, asyncHandler(driverOnboardingController.patchActive))

router.get('/profiles/customers', CUSTOMERS, asyncHandler(profileController.listCustomerProfiles))
router.get('/profiles/customers/:id', CUSTOMERS, asyncHandler(profileController.getCustomerProfile))
router.patch('/profiles/customers/:id', CUSTOMERS, asyncHandler(profileController.patchCustomerProfile))
router.post('/profiles/customers/:id/ai-summary', CUSTOMERS, asyncHandler(profileController.generateCustomerAiSummary))
router.get('/profiles/drivers', ORDERS, asyncHandler(profileController.listDriverProfiles))
router.get('/profiles/drivers/:id', ORDERS, asyncHandler(profileController.getDriverProfile))
router.patch('/profiles/drivers/:id', ORDERS, asyncHandler(profileController.patchDriverProfile))
router.post('/profiles/drivers/:id/ai-summary', ORDERS, asyncHandler(profileController.generateDriverAiSummary))

router.get('/crm/audiences', P('crm', 'view'), asyncHandler(crmController.listAudiences))
router.post('/crm/audiences', P('crm', 'create'), asyncHandler(crmController.createAudience))
router.get('/crm/audiences/:id', P('crm', 'view'), asyncHandler(crmController.getAudience))
router.post('/crm/audiences/:id/refresh', P('crm', 'update'), asyncHandler(crmController.refreshAudience))
router.get('/crm/audiences/:id/export', P('crm', 'export'), asyncHandler(crmController.exportAudience))
router.get('/crm/marketing-logs', P('crm', 'view'), asyncHandler(crmController.listMarketingLogs))
router.post('/crm/marketing-logs', P('crm', 'update'), asyncHandler(crmController.createMarketingLog))

router.get('/customers', CUSTOMERS, asyncHandler(adminController.listCustomers))
router.get('/customers/:id/orders', CUSTOMERS, asyncHandler(adminController.getCustomerOrders))
router.patch('/customers/:id/status', CUSTOMERS, asyncHandler(adminController.updateCustomerStatus))

router.get('/support-tickets', P('support_tickets', 'view'), asyncHandler(supportTicketController.listSupportTickets))
router.post('/support-tickets', P('support_tickets', 'create'), asyncHandler(supportTicketController.createSupportTicket))
router.get('/support-tickets/:id', P('support_tickets', 'view'), asyncHandler(supportTicketController.getSupportTicket))
router.patch('/support-tickets/:id', P('support_tickets', 'update'), asyncHandler(supportTicketController.patchSupportTicket))
router.patch('/support-tickets/:id/status', P('support_tickets', 'update'), asyncHandler(supportTicketController.patchSupportTicketStatus))
router.post('/support-tickets/:id/comment', P('support_tickets', 'update'), asyncHandler(supportTicketController.addSupportTicketComment))

router.put('/staff-driver-relations', ORDERS, asyncHandler(adminController.upsertStaffDriverRelation))

/** 后台任务队列（只读监控 + admin 手动入队） */
router.get('/jobs/stats', P('job_queue', 'view'), asyncHandler(jobQueueController.getJobQueueStats))
router.get('/jobs/recent', P('job_queue', 'view'), asyncHandler(jobQueueController.getRecentJobs))
router.get('/jobs', P('job_queue', 'view'), asyncHandler(jobQueueController.listJobs))
router.post('/jobs/enqueue', ADMIN_ONLY, asyncHandler(jobQueueController.enqueueJobAdmin))

module.exports = router
