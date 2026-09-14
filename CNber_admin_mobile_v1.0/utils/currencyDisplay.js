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

export function customerPriceCell(order) {
  if (order?.couponCode && order.payableAmountCny != null) {
    const main = formatCny(order.payableAmountCny)
    const orig = order.originalAmountCny ?? order.customerPriceCny
    const sub = `原价 ${formatCny(orig)} · ${order.couponCode}`
    return { main, sub }
  }
  const cny = firstPositive(order?.payableAmountCny, order?.customerPriceCny, order?.orderAmountCny)
  return { main: cny == null ? '—' : formatCny(cny), sub: '' }
}

export function driverPriceCell(order) {
  const cny = firstPositive(order?.driverSettlementCny, order?.driverPriceCny)
  if (cny == null) return { main: '待确认', sub: '' }
  return { main: formatCny(cny), sub: '' }
}

export function formatGbp() {
  return '—'
}
