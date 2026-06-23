const Coupon = require('../models/Coupon')
const {
  normalizeCouponCode,
  calculateCouponDiscount
} = require('./couponEngine')

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100
}

/** 订单客户价 CNY（与客户端 customerCnyFromOrder 对齐） */
function getOrderCustomerPriceCny(order) {
  if (!order) return 0
  if (order.originalAmountCny != null && order.payableAmountCny != null && order.couponCode) {
    return Number(order.originalAmountCny)
  }
  if (order.customerPriceCny != null) return roundMoney(order.customerPriceCny)
  const gbp = Number(
    order.priceBreakdown?.totalPrice ??
      order.quoteBreakdown?.totalPrice ??
      order.amount ??
      0
  )
  const rate = Number(order.exchangeRate ?? 10)
  if (Number.isFinite(gbp) && gbp > 0 && Number.isFinite(rate) && rate > 0) {
    return roundMoney(gbp * rate)
  }
  return 0
}

function buildOrderLike(order, amountCny) {
  return {
    customerPriceCny: amountCny,
    serviceType: order.serviceType || '',
    vehicleClass: order.vehicleClass || '',
    userId: order.userId
  }
}

/**
 * 服务端校验优惠码并生成订单快照字段（不扣库存）
 * @returns {{ couponCode, discountAmountCny, originalAmountCny, payableAmountCny }}
 */
async function resolveCouponSnapshot(order, rawCode) {
  const code = normalizeCouponCode(rawCode)
  if (!code) {
    const e = new Error('优惠码不能为空')
    e.code = 400
    throw e
  }
  const coupon = await Coupon.findOne({ code }).lean()
  if (!coupon) {
    const e = new Error('优惠券不存在')
    e.code = 400
    throw e
  }
  const originalAmountCny = getOrderCustomerPriceCny(order)
  if (originalAmountCny <= 0) {
    const e = new Error('订单金额无效，无法使用优惠码')
    e.code = 400
    throw e
  }
  const calc = calculateCouponDiscount(coupon, buildOrderLike(order, originalAmountCny))
  if (!calc.valid) {
    const e = new Error(calc.reason || '优惠码不可用')
    e.code = 400
    throw e
  }
  return {
    couponCode: coupon.code,
    discountAmountCny: roundMoney(calc.discountAmountCny),
    originalAmountCny: roundMoney(originalAmountCny),
    payableAmountCny: roundMoney(calc.payableAmountCny)
  }
}

/** 公开校验（无订单上下文时用 query 参数） */
function validateCouponForQuery(coupon, query = {}) {
  const amountCny = Number(query.amountCny ?? query.customerPriceCny ?? 0)
  return calculateCouponDiscount(coupon, {
    customerPriceCny: amountCny,
    serviceType: String(query.serviceType || '').trim(),
    vehicleClass: String(query.vehicleClass || '').trim()
  })
}

module.exports = {
  getOrderCustomerPriceCny,
  resolveCouponSnapshot,
  validateCouponForQuery,
  roundMoney
}
