/** 司机端金额：只展示 Backend 给出的真实 CNY。禁止任何汇率换算。 */

export const SYSTEM_CURRENCY = 'CNY'

function toFiniteNumber(amount) {
  if (amount == null || amount === '') return null
  const n = Number(amount)
  return Number.isFinite(n) ? n : null
}

export function formatCurrency(amount, currency = SYSTEM_CURRENCY) {
  const n = toFiniteNumber(amount)
  if (n == null) return '待确认'
  return `¥${n.toFixed(2)}`
}

export function formatCny(amount) {
  return formatCurrency(amount, 'CNY')
}

function firstPositive(...values) {
  for (const raw of values) {
    const n = toFiniteNumber(raw)
    if (n != null && n > 0) return n
  }
  return null
}

/** 客户订单金额：只读 Backend 展示字段 / 已存 CNY，禁止 amount×汇率 */
export function customerOrderAmountCny(order) {
  if (!order) return null
  return firstPositive(
    order.displayCustomerPriceCny,
    order.customerPriceCny,
    order.orderAmountCny
  )
}

/** 司机结算：只读真实 CNY 结算字段，禁止 GBP×汇率 / 75% 推算 */
export function driverSettlementCnyFromOrder(order) {
  if (!order) return null
  return firstPositive(order.displayDriverSettlementCny, order.driverSettlementCny)
}

export function driverPrimaryOrderAmountLine(order) {
  const n = customerOrderAmountCny(order)
  return n == null ? '订单金额：待确认' : `订单金额 ${formatCny(n)}`
}

export function driverSecondarySettlementLine(order) {
  const n = driverSettlementCnyFromOrder(order)
  if (n == null) return '司机结算：待确认'
  return `司机结算 ${formatCny(n)}`
}

export function settlementDisplayText(order) {
  const n = driverSettlementCnyFromOrder(order)
  return n == null ? '待确认' : formatCny(n)
}

/** @deprecated 本阶段不展示 GBP，禁止换算 */
export function formatGbp() {
  return '待确认'
}

export function driverGbpFromOrder() {
  return null
}

export function driverPrimarySettlementLine(order) {
  return driverPrimaryOrderAmountLine(order)
}
