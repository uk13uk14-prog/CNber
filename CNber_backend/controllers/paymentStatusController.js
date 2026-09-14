const mongoose = require('mongoose')
const Order = require('../models/Order')

function ownerId(order) {
  return order.userId && (order.userId._id || order.userId)
}

/**
 * GET /api/payment/:orderId/status
 * 只读服务端真实状态。禁止根据 Client 请求把订单改成 paid。
 */
exports.getPaymentStatus = async (req, res) => {
  const orderId = String(req.params.orderId || '').trim()
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    const e = new Error('订单无效')
    e.code = 400
    throw e
  }
  const order = await Order.findById(orderId).lean()
  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  if (req.user.role === 'user' && String(ownerId(order)) !== String(req.user.userId)) {
    const e = new Error('无权查看该订单')
    e.code = 403
    throw e
  }
  const depositStatus = order.depositStatus || order.payment?.depositStatus || 'unpaid'
  const paymentStage = order.paymentStage || ''
  const depositConfirmed =
    depositStatus === 'confirmed' ||
    paymentStage === 'deposit_confirmed' ||
    order.depositPaid === true
  res.json({
    code: 0,
    message: 'success',
    data: {
      orderId: String(order._id),
      orderNo: order.orderNo || '',
      status: order.status || '',
      paymentStage,
      depositStatus,
      depositPaid: Boolean(depositConfirmed),
      paid: Boolean(depositConfirmed),
      source: 'server',
      note: 'paid 仅在后台人工确认或未来微信/支付宝服务端回调验签后为 true，Client 不可写入'
    }
  })
}
