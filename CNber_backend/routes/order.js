const express = require('express')
const router = express.Router()
const Order = require('../models/Order')
const ORDER_STATUS = Order.ORDER_STATUS
const asyncHandler = require('../utils/asyncHandler')
const orderController = require('../controllers/orderController')
const orderPaymentController = require('../controllers/orderPaymentController')
const orderRatingController = require('../controllers/orderRatingController')

router.get('/detail/:id', asyncHandler(orderController.getOrderById))
router.post('/rating', asyncHandler(orderRatingController.submitOrderRating))
router.get('/:id/rating', asyncHandler(orderRatingController.getOrderRating))
router.post('/quote', asyncHandler(orderController.quoteOrder))
router.post('/auto-quote', asyncHandler(orderController.autoQuoteOrder))
router.post('/confirm-price', asyncHandler(orderController.confirmPrice))
router.post('/pay', asyncHandler(orderController.payOrder))

router.post('/:id/payment-proof/upload', asyncHandler(orderPaymentController.uploadPaymentProof))
router.post('/:id/deposit/submit', asyncHandler(orderPaymentController.submitDeposit))
router.post('/:id/balance/submit', asyncHandler(orderPaymentController.submitBalance))

router.post(
  '/create',
  (req, res, next) => {
    req.body.userId = req.user.userId
    // 创建订单强制为已创建，禁止客户端篡改状态绕过状态机
    req.body.status = ORDER_STATUS.CREATED
    next()
  },
  asyncHandler(orderController.createOrder)
)

router.get(
  '/list',
  (req, res, next) => {
    if (req.user.role === 'user') {
      req.orderQuery = { userId: req.user.userId }
      return next()
    }

    if (req.user.role === 'driver') {
      // 后台派单模式：司机端只看已指派给自己的订单，不再暴露 pending 抢单池
      req.orderQuery = { driverId: req.user.userId }
      return next()
    }

    if (req.user.role === 'admin') {
      req.orderQuery = {}
      return next()
    }

    const e = new Error('无权限查看订单')
    e.code = 403
    return next(e)
  },
  asyncHandler(orderController.listOrders)
)

/**
 * 接单：
 * assigned 且 driverId 为本人：确认指派 → driver_accepted
 */
router.post(
  '/accept',
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'driver') {
      throw { code: 403, message: 'Forbidden' }
    }

    const { orderId } = req.body
    if (!orderId) {
      throw { code: 400, message: '缺少 orderId' }
    }

    let order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: ORDER_STATUS.ASSIGNED,
        driverId: req.user.userId
      },
      {
        $set: {
          status: ORDER_STATUS.DRIVER_ACCEPTED,
          dispatchStatus: Order.DISPATCH_STATUS.ACCEPTED,
          updatedAt: new Date()
        }
      },
      { new: true }
    )

    if (!order) {
      throw { code: 400, message: 'Order already taken' }
    }

    res.json({
      code: 0,
      message: 'success',
      data: { order }
    })
  })
)

/**
 * 开始行程：仅 accepted → started，且必须当前司机
 */
router.post('/start', asyncHandler(orderController.startOrder))

/**
 * 完成订单：仅 started → completed，且必须当前司机
 */
router.post('/complete', asyncHandler(orderController.completeOrder))

/**
 * 拒单：仅 assigned 且指派给当前司机，回到 pending 池并清空 driverId
 */
router.post('/reject', asyncHandler(orderController.rejectOrder))

/**
 * 取消订单：仅 accepted / started，且必须当前司机
 */
router.post('/cancel', asyncHandler(orderController.cancelOrder))

router.post('/passenger-cancel', asyncHandler(orderController.cancelPassengerOrder))

module.exports = router
