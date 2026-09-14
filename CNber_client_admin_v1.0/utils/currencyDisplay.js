/** 系统基础货币：CNY。禁止 £ / GBP 业务展示。 */

export const SYSTEM_CURRENCY = 'CNY'

export function formatCurrency(amount, currency = SYSTEM_CURRENCY) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  return `¥${n.toFixed(2)}`
}

export function formatCny(amount) {
  return formatCurrency(amount, 'CNY')
}

function firstPositive(...values) {
  for (const raw of values) {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

export function customerCnyFromOrder(order) {
  if (!order) return null
  return firstPositive(
    order.payableAmountCny,
    order.customerPriceCny,
    order.originalAmountCny,
    order.finalPriceCny,
    order.quoteBreakdown?.customerPriceCny,
    order.orderAmountCny
  )
}

export function clientPrimaryAmountLine(order) {
  const n = customerCnyFromOrder(order)
  return n == null ? '—' : formatCny(n)
}

export function clientSecondaryAmountLine(order) {
  if (order?.couponCode && order.payableAmountCny != null) {
    const orig = order.originalAmountCny ?? customerCnyFromOrder(order)
    return `已用 ${order.couponCode}，原价 ${formatCny(orig)}`
  }
  return ''
}

/** @deprecated 本阶段不展示 GBP */
export function formatGbp() {
  return '—'
}

export function customerGbpFromOrder() {
  return null
}
