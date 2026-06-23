/** 优惠券状态与金额计算（V1：fixed 为主） */

const STATUS = {
  NOT_STARTED: 'not_started',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  DISABLED: 'disabled',
  EXHAUSTED: 'exhausted'
}

const STATUS_LABELS = {
  [STATUS.NOT_STARTED]: '未开始',
  [STATUS.ACTIVE]: '进行中',
  [STATUS.EXPIRED]: '已过期',
  [STATUS.DISABLED]: '已禁用',
  [STATUS.EXHAUSTED]: '已用完'
}

function normalizeCouponCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
}

function getCouponStatus(coupon, now = new Date()) {
  if (!coupon) return STATUS.DISABLED
  if (coupon.enabled === false) return STATUS.DISABLED
  const t = now instanceof Date ? now : new Date(now)
  const start = coupon.startAt ? new Date(coupon.startAt) : null
  const end = coupon.endAt ? new Date(coupon.endAt) : null
  if (start && t < start) return STATUS.NOT_STARTED
  if (end && t > end) return STATUS.EXPIRED
  const limit = Number(coupon.usageLimit || 0)
  const used = Number(coupon.usedCount || 0)
  if (limit > 0 && used >= limit) return STATUS.EXHAUSTED
  return STATUS.ACTIVE
}

function getCouponStatusLabel(coupon, now) {
  return STATUS_LABELS[getCouponStatus(coupon, now)] || '—'
}

function matchesServiceTypes(coupon, serviceType) {
  const list = coupon?.serviceTypes || []
  if (!list.length) return true
  if (!serviceType) return false
  return list.includes(String(serviceType))
}

function matchesVehicleClasses(coupon, vehicleClass) {
  const list = coupon?.vehicleClasses || []
  if (!list.length) return true
  if (!vehicleClass) return false
  return list.includes(String(vehicleClass))
}

function canUseCoupon(coupon, orderLike = {}, userId) {
  if (!coupon) return { ok: false, reason: '优惠券不存在' }
  const status = getCouponStatus(coupon)
  if (status === STATUS.DISABLED) return { ok: false, reason: '优惠券已禁用' }
  if (status === STATUS.NOT_STARTED) return { ok: false, reason: '优惠券未开始' }
  if (status === STATUS.EXPIRED) return { ok: false, reason: '优惠券已过期' }
  if (status === STATUS.EXHAUSTED) return { ok: false, reason: '优惠券已用完' }

  const amount = Number(orderLike.customerPriceCny ?? orderLike.amountCny ?? 0)
  const minSpend = Number(coupon.minSpendCny || 0)
  if (minSpend > 0 && amount < minSpend) {
    return { ok: false, reason: `未满最低消费 ¥${minSpend}` }
  }

  const serviceType = orderLike.serviceType
  if (!matchesServiceTypes(coupon, serviceType)) {
    return { ok: false, reason: '不适用当前服务类型' }
  }

  const vehicleClass = orderLike.vehicleClass
  if (!matchesVehicleClasses(coupon, vehicleClass)) {
    return { ok: false, reason: '不适用当前车型' }
  }

  // perUserLimit / userId — V1 预留，无使用记录时不校验
  void userId

  return { ok: true, reason: '' }
}

function calculateCouponDiscount(coupon, orderLike = {}) {
  const amount = Math.max(0, Number(orderLike.customerPriceCny ?? orderLike.amountCny ?? 0))
  const check = canUseCoupon(coupon, orderLike)
  if (!check.ok) {
    return {
      valid: false,
      reason: check.reason,
      discountAmountCny: 0,
      payableAmountCny: amount
    }
  }

  const type = coupon.type || 'fixed'
  let discountAmountCny = 0
  if (type === 'percent') {
    const pct = Math.min(100, Math.max(0, Number(coupon.discountPercent || 0)))
    discountAmountCny = Math.round((amount * pct) / 100)
  } else {
    discountAmountCny = Math.max(0, Number(coupon.discountAmountCny || 0))
  }
  discountAmountCny = Math.min(discountAmountCny, amount)
  const payableAmountCny = Math.max(0, amount - discountAmountCny)

  return {
    valid: true,
    reason: '',
    discountAmountCny,
    payableAmountCny
  }
}

/** 活动状态 */
const CAMPAIGN_STATUS = {
  NOT_STARTED: 'not_started',
  ACTIVE: 'active',
  ENDED: 'ended',
  DISABLED: 'disabled'
}

const CAMPAIGN_STATUS_LABELS = {
  [CAMPAIGN_STATUS.NOT_STARTED]: '未开始',
  [CAMPAIGN_STATUS.ACTIVE]: '进行中',
  [CAMPAIGN_STATUS.ENDED]: '已结束',
  [CAMPAIGN_STATUS.DISABLED]: '已禁用'
}

function getCampaignStatus(campaign, now = new Date()) {
  if (!campaign) return CAMPAIGN_STATUS.DISABLED
  if (campaign.enabled === false) return CAMPAIGN_STATUS.DISABLED
  const t = now instanceof Date ? now : new Date(now)
  const start = campaign.startAt ? new Date(campaign.startAt) : null
  const end = campaign.endAt ? new Date(campaign.endAt) : null
  if (start && t < start) return CAMPAIGN_STATUS.NOT_STARTED
  if (end && t > end) return CAMPAIGN_STATUS.ENDED
  return CAMPAIGN_STATUS.ACTIVE
}

function getCampaignStatusLabel(campaign, now) {
  return CAMPAIGN_STATUS_LABELS[getCampaignStatus(campaign, now)] || '—'
}

module.exports = {
  STATUS,
  STATUS_LABELS,
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_LABELS,
  normalizeCouponCode,
  getCouponStatus,
  getCouponStatusLabel,
  getCampaignStatus,
  getCampaignStatusLabel,
  canUseCoupon,
  calculateCouponDiscount,
  matchesServiceTypes,
  matchesVehicleClasses
}
