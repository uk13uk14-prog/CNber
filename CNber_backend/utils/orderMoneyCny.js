const { roundMoney } = require('./pricing')

const SYSTEM_CURRENCY = 'CNY'

function firstPositive(...values) {
  for (const raw of values) {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return roundMoney(n)
  }
  return null
}

/** 客户订单总额 CNY：只用已写入的人民币字段，禁止 amount×汇率 */
function customerOrderAmountCny(order = {}) {
  return firstPositive(order.customerPriceCny, order.payableAmountCny)
}

/** 司机结算 CNY：只用已存人民币结算字段，禁止 GBP×汇率 / 75% 推算 */
function driverSettlementAmountCny(order = {}) {
  return firstPositive(order.driverSettlementCny)
}

function looksLikeCnyScale(value, totalCny) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return false
  if (!totalCny || totalCny <= 0) return n >= 1
  return n + 0.001 >= totalCny * 0.05
}

function paidAmountCny(order = {}) {
  const total = customerOrderAmountCny(order)
  const paid = Number(order.paidAmount)
  if (looksLikeCnyScale(paid, total)) return roundMoney(paid)
  const depPaid = Number(order.depositPaymentInfo?.paidAmount)
  const balPaid = Number(order.balancePaymentInfo?.paidAmount)
  let sum = 0
  if (looksLikeCnyScale(depPaid, total)) sum += depPaid
  if (looksLikeCnyScale(balPaid, total)) sum += balPaid
  if (sum > 0) return roundMoney(sum)
  return 0
}

function depositDueCny(order = {}) {
  const total = customerOrderAmountCny(order)
  if (total == null) return null
  const paidDep = Number(order.depositPaymentInfo?.paidAmount)
  if (looksLikeCnyScale(paidDep, total)) return roundMoney(paidDep)
  return roundMoney(total * 0.1)
}

function remainingDueCny(order = {}) {
  const total = customerOrderAmountCny(order)
  if (total == null) return null
  return roundMoney(Math.max(0, total - paidAmountCny(order)))
}

function platformProfitAmountCny(order = {}) {
  const n = Number(order.platformProfitCny)
  if (Number.isFinite(n)) return roundMoney(n)
  const customer = customerOrderAmountCny(order)
  const driver = driverSettlementAmountCny(order)
  if (customer != null && driver != null) return roundMoney(customer - driver)
  return null
}

function attachSystemCurrency(order) {
  if (!order || typeof order !== 'object') return order
  const displayCustomerPriceCny = customerOrderAmountCny(order)
  const displayDriverSettlementCny = driverSettlementAmountCny(order)
  return {
    ...order,
    currency: SYSTEM_CURRENCY,
    orderAmountCny: displayCustomerPriceCny,
    displayCustomerPriceCny,
    displayDepositDueCny: depositDueCny(order),
    displayRemainingDueCny: remainingDueCny(order),
    displayPaidAmountCny: paidAmountCny(order),
    displayDriverSettlementCny,
    displayPlatformProfitCny: platformProfitAmountCny(order)
  }
}

module.exports = {
  SYSTEM_CURRENCY,
  customerOrderAmountCny,
  driverSettlementAmountCny,
  paidAmountCny,
  depositDueCny,
  remainingDueCny,
  platformProfitAmountCny,
  attachSystemCurrency
}
