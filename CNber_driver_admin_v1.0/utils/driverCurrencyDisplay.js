/** 司机端：GBP 结算价 + 汇率换算 CNY */

export function formatGbp(amount) {
  const n = Number(amount)
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : '—'
}

export function formatCny(amount) {
  const n = Number(amount)
  return Number.isFinite(n) ? `¥${n.toFixed(2)}` : '—'
}

export function driverGbpFromOrder(order) {
  if (!order) return null
  if (order.driverPriceGbp != null) return Number(order.driverPriceGbp)
  if (order.driverSettlementGbp != null) return Number(order.driverSettlementGbp)
  if (order.driverAmount != null) return Number(order.driverAmount)
  const n = Number(order.priceBreakdown?.driverPayout ?? order.driverSettlementAmount)
  return Number.isFinite(n) ? n : null
}

export function driverSettlementCnyFromOrder(order) {
  if (!order) return null
  if (order.driverSettlementCny != null) return Number(order.driverSettlementCny)
  if (order.driverPriceCny != null) return Number(order.driverPriceCny)
  const gbp = driverGbpFromOrder(order)
  const rate = Number(order.exchangeRate ?? 10)
  if (gbp == null || !Number.isFinite(rate)) return null
  return Math.round(gbp * rate * 100) / 100
}

export function driverPrimarySettlementLine(order) {
  return `本单结算 ${formatGbp(driverGbpFromOrder(order))}`
}

export function driverSecondarySettlementLine(order) {
  const cny = driverSettlementCnyFromOrder(order)
  if (cny == null) return ''
  return `约 ${formatCny(cny)}`
}
