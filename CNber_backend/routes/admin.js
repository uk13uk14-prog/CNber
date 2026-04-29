const express = require('express')
const router = express.Router()
const asyncHandler = require('../utils/asyncHandler')
const adminController = require('../controllers/adminController')

router.get('/stats', asyncHandler(adminController.getStats))
router.get('/pricing-rules', asyncHandler(adminController.listPricingRules))
router.post(
  '/pricing-rules/import',
  asyncHandler(adminController.importPricingRules)
)
router.post(
  '/price-matrix/import',
  asyncHandler(adminController.importPriceMatrix)
)
router.put(
  '/pricing-rules/:id',
  asyncHandler(adminController.updatePricingRule)
)

/** 列表须在 :id 动态路由之前 */
router.get('/orders', asyncHandler(adminController.listAdminOrders))
router.get('/orders/:id', asyncHandler(adminController.getOrderDetail))
router.post('/orders/:id/assign', asyncHandler(adminController.assignDriver))
router.post(
  '/orders/:id/assign-driver',
  asyncHandler(adminController.assignDriver)
)
router.patch(
  '/orders/:id/assign-driver',
  asyncHandler(adminController.assignDriver)
)
router.patch(
  '/orders/:id/unassign-driver',
  asyncHandler(adminController.unassignDriver)
)

router.post('/orders/:id/notes', asyncHandler(adminController.addFollowUpNote))
router.post(
  '/orders/:id/status',
  asyncHandler(adminController.updateOrderStatus)
)

router.get(
  '/drivers/for-dispatch',
  asyncHandler(adminController.getDriversForDispatch)
)
router.get('/drivers/available', asyncHandler(adminController.listAvailableDrivers))
router.get('/drivers', asyncHandler(adminController.listDrivers))

router.put(
  '/staff-driver-relations',
  asyncHandler(adminController.upsertStaffDriverRelation)
)

module.exports = router
