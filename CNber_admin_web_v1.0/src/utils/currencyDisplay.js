/** Admin 订单价格展示：统一 CNY，禁止 £ / 约 £xxx */

export const SYSTEM_CURRENCY = 'CNY'

export function formatCurrency(amount, currency = SYSTEM_CURRENCY) {
  if (amount == null || amount === '') return '—'
  const n = Number(amount)
  return Number.isFinite(n) ? `¥${n.toFixed(2)}` : String(amount)
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

export function customerOrderAmountCny(order) {
  if (!order) return null
  return firstPositive(
    order.payableAmountCny,
    order.customerPriceCny,
    order.orderAmountCny,
    order.originalAmountCny,
    order.finalPriceCny,
    order.quoteBreakdown?.customerPriceCny
  )
}

export function driverSettlementAmountCny(order) {
  if (!order) return null
  return firstPositive(
    order.driverSettlementCny,
    order.driverPriceCny,
    order.displayDriverSettlementCny
  )
}

export function customerPriceCell(order) {
  if (order?.couponCode && order.payableAmountCny != null) {
    const main = formatCny(order.payableAmountCny)
    const orig = order.originalAmountCny ?? order.customerPriceCny
    const sub = `原价 ${formatCny(orig)} · ${order.couponCode} -${formatCny(order.discountAmountCny)}`
    return { main, sub }
  }
  const cny = customerOrderAmountCny(order)
  return { main: cny == null ? '—' : formatCny(cny), sub: '' }
}

export function driverPriceCell(order) {
  const cny = driverSettlementAmountCny(order)
  if (cny == null) return { main: '待确认', sub: '' }
  return { main: formatCny(cny), sub: '' }
}

export function platformProfitCell(order) {
  return formatCny(order?.platformProfitCny ?? order?.displayPlatformProfitCny)
}

/** @deprecated 本阶段不展示 GBP */
export function formatGbp() {
  return '—'
}

export function dualPriceFromOrder(_order, _gbpAmount, cnyField) {
  return formatCny(_order?.[cnyField])
}
