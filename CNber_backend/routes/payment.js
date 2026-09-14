const express = require('express')
const router = express.Router()
const asyncHandler = require('../utils/asyncHandler')
const paymentPublicController = require('../controllers/paymentPublicController')
const paymentAppPayReservedController = require('../controllers/paymentAppPayReservedController')
const paymentStatusController = require('../controllers/paymentStatusController')

function allowUserOrAdmin(req, res, next) {
  if (!req.user || !['user', 'admin'].includes(req.user.role)) {
    const e = new Error('Forbidden')
    e.code = 403
    return next(e)
  }
  next()
}

router.get('/accounts', allowUserOrAdmin, asyncHandler(paymentPublicController.listAccountsByScene))

/** 未来微信 App 支付下单 — 未开通，禁止假成功 */
router.post('/wechat/create', asyncHandler(paymentAppPayReservedController.createWechatAppPay))
/** 未来支付宝 App 支付下单 — 未开通，禁止假成功 */
router.post('/alipay/create', asyncHandler(paymentAppPayReservedController.createAlipayAppPay))
/** 只读真实支付状态，不接受 Client 把订单标成 paid */
router.get('/:orderId/status', asyncHandler(paymentStatusController.getPaymentStatus))

module.exports = router
