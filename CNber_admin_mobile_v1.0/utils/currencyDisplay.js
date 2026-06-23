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
    const sub = `原价 ${formatCny(orig)} · ${order.couponCode}`
    return { main, sub }
  }
  const cny = order?.customerPriceCny ?? order?.payableAmountCny
  const main = formatCny(cny)
  return { main, sub: '' }
}

export function driverPriceCell(order) {
  const gbp = order?.driverPriceGbp ?? order?.priceBreakdown?.driverPayout
  const main = formatGbp(gbp)
  const cny = order?.driverSettlementCny ?? order?.driverPriceCny
  const sub = cny != null ? `约 ${formatCny(cny)}` : ''
  return { main, sub }
}
