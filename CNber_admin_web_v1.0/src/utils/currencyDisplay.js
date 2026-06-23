/** Admin 订单价格展示（V1 固定报价优先） */

export function formatGbp(amount) {
  if (amount == null || amount === '') return '—'
  const n = Number(amount)
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : String(amount)
}

export function formatCny(amount) {
  if (amount == null || amount === '') return '—'
  const n = Number(amount)
  return Number.isFinite(n) ? `¥${n.toFixed(2)}` : String(amount)
}

export function customerPriceCell(order) {
  if (order?.couponCode && order.payableAmountCny != null) {
    const main = formatCny(order.payableAmountCny)
    const orig = order.originalAmountCny ?? order.customerPriceCny
    const sub = `原价 ${formatCny(orig)} · ${order.couponCode} -${formatCny(order.discountAmountCny)}`
    return { main, sub }
  }
  const cny = order?.payableAmountCny ?? order?.customerPriceCny ?? order?.finalPriceCny
  const gbp =
    order?.customerPriceGbp ??
    order?.amount ??
    (cny && order?.exchangeRate ? cny / order.exchangeRate : null)
  const main = formatCny(cny)
  const sub = gbp != null ? `约 ${formatGbp(gbp)}` : ''
  return { main, sub }
}

export function driverPriceCell(order) {
  const gbp = order?.driverPriceGbp ?? order?.priceBreakdown?.driverPayout
  const cny = order?.driverSettlementCny ?? order?.driverPriceCny
  const main = formatGbp(gbp)
  const sub = cny != null ? `约 ${formatCny(cny)}` : ''
  return { main, sub }
}

export function platformProfitCell(order) {
  return formatCny(order?.platformProfitCny)
}

/** @deprecated 旧双币种 GBP/CNY 换算展示 */
export function dualPriceFromOrder(order, gbpAmount, cnyField) {
  const gbp = Number(gbpAmount)
  const cny =
    order?.[cnyField] ??
    (Number.isFinite(gbp) && order?.exchangeRate ? gbp * Number(order.exchangeRate) : null)
  const gbpStr = formatGbp(gbp)
  if (cny == null || cny === '') return gbpStr
  return `${gbpStr} / ${formatCny(cny)}`
}
