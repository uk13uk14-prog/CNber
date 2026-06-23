const Coupon = require('../models/Coupon')
const {
  normalizeCouponCode,
  calculateCouponDiscount
} = require('../utils/couponEngine')

/** GET /api/public/coupons/validate */
exports.validatePublicCoupon = async (req, res) => {
  const code = normalizeCouponCode(req.query.code)
  if (!code) {
    const e = new Error('请提供优惠码 code')
    e.code = 400
    throw e
  }

  const coupon = await Coupon.findOne({ code }).lean()
  const orderLike = {
    customerPriceCny: Number(req.query.amountCny ?? req.query.customerPriceCny ?? 0),
    serviceType: String(req.query.serviceType || '').trim(),
    vehicleClass: String(req.query.vehicleClass || '').trim()
  }

  if (!coupon) {
    return res.json({
      code: 0,
      message: 'success',
      data: {
        valid: false,
        code,
        reason: '优惠券不存在',
        discountAmountCny: 0,
        payableAmountCny: Math.max(0, orderLike.customerPriceCny)
      }
    })
  }

  const result = calculateCouponDiscount(coupon, orderLike)
  res.json({
    code: 0,
    message: 'success',
    data: {
      valid: result.valid,
      code: coupon.code,
      reason: result.reason || undefined,
      discountAmountCny: result.discountAmountCny,
      payableAmountCny: result.payableAmountCny
    }
  })
}
