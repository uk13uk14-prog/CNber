/** 客户端仅展示客户价 CNY（不展示 GBP） */

export function formatCny(amount) {
  const n = Number(amount)
  return Number.isFinite(n) ? `¥${n.toFixed(2)}` : '—'
}

function gbpToCny(gbp, rate) {
  const g = Number(gbp)
  const r = Number(rate)
  if (!Number.isFinite(g) || !Number.isFinite(r) || r <= 0) return null
  return Math.round(g * r * 100) / 100
}

function isFixedPricingOrder(order) {
  if (!order) return false
  const src = order.pricingSource || order.quoteBreakdown?.pricingSource || ''
  return (
    order.pricingMode === 'fixed' ||
    order.quoteBreakdown?.pricingMode === 'fixed' ||
    ['fixed', 'route_fixed', 'service_default'].includes(src)
  )
}

/**
 * 客户价 CNY 优先级：
 * payableAmountCny → customerPriceCny → finalPriceCny → quoteBreakdown → legacy GBP×汇率
 */
export function customerCnyFromOrder(order) {
  if (!order) return null

  if (order.payableAmountCny != null && Number.isFinite(Number(order.payableAmountCny))) {
    return Number(order.payableAmountCny)
  }
  if (order.customerPriceCny != null && Number.isFinite(Number(order.customerPriceCny))) {
    return Number(order.customerPriceCny)
  }
  if (order.finalPriceCny != null && Number.isFinite(Number(order.finalPriceCny))) {
    return Number(order.finalPriceCny)
  }
  if (order.quoteBreakdown?.customerPriceCny != null) {
    return Number(order.quoteBreakdown.customerPriceCny)
  }

  const gbp =
    order.priceBreakdown?.totalPrice ??
    order.quoteBreakdown?.totalPrice ??
    order.amount
  return gbpToCny(gbp, order.exchangeRate ?? 10)
}

export function clientUsesLegacyCnyEstimate(order) {
  if (!order || isFixedPricingOrder(order)) return false
  return (
    order.payableAmountCny == null &&
    order.customerPriceCny == null &&
    order.finalPriceCny == null &&
    order.quoteBreakdown?.customerPriceCny == null
  )
}

/** 主行：¥900.00 */
export function clientPrimaryAmountLine(order) {
  return formatCny(customerCnyFromOrder(order))
}

/** 副行：仅优惠/legacy 提示，不展示 GBP */
export function clientSecondaryAmountLine(order) {
  if (order?.couponCode && order.payableAmountCny != null) {
    const orig = order.originalAmountCny ?? customerCnyFromOrder(order)
    return `已用 ${order.couponCode}，原价 ${formatCny(orig)}`
  }
  if (clientUsesLegacyCnyEstimate(order)) {
    return '（参考价，以平台确认为准）'
  }
  return ''
}

/** @deprecated 客户端不再展示 GBP */
export function formatGbp() {
  return '—'
}

export function customerGbpFromOrder() {
  return null
}
