const { paymentSummary, roundMoney } = require('./pricing')
const { mapToMvpStatus } = require('./orderPaymentSync')

function phoneOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref.phone) return ref.phone
  return ''
}

function driverPayoutOf(order) {
  const v = order.priceBreakdown?.driverPayout
  if (v != null && v !== '') return roundMoney(v)
  const total = paymentSummary(order).totalPrice
  return roundMoney(total * 0.75)
}

function platformProfitOf(order) {
  const v = order.priceBreakdown?.platformProfit
  if (v != null && v !== '') return roundMoney(v)
  const total = paymentSummary(order).totalPrice
  return roundMoney(total - driverPayoutOf(order))
}

function depositPaidAmount(order) {
  const st = mapToMvpStatus(order.payment?.depositStatus || order.depositStatus)
  if (st !== 'confirmed' && !order.depositPaid) return 0
  const summary = paymentSummary(order)
  return roundMoney(
    order.depositPaymentInfo?.paidAmount ??
      order.payment?.depositAmount ??
      order.depositAmount ??
      summary.depositAmount
  )
}

function balancePaidAmount(order) {
  const st = mapToMvpStatus(order.payment?.balanceStatus || order.balanceStatus)
  if (st !== 'confirmed' && !order.remainingPaid) return 0
  const summary = paymentSummary(order)
  return roundMoney(
    order.balancePaymentInfo?.paidAmount ??
      order.payment?.balanceAmount ??
      order.balanceAmount ??
      summary.balanceAmount
  )
}

function refundAmountOf(order) {
  let sum = 0
  if (order.depositStatus === 'refunded') sum += depositPaidAmount(order)
  if (order.balanceStatus === 'refunded') sum += balancePaidAmount(order)
  return roundMoney(sum)
}

function computeSettlementStatus(order) {
  if (order.settlementStatus && ['unsettled', 'partially_settled', 'settled'].includes(order.settlementStatus)) {
    return order.settlementStatus
  }
  if (order.driverSettlementStatus === 'paid') return 'settled'
  const dep = depositPaidAmount(order)
  const bal = balancePaidAmount(order)
  const driverDue = driverPayoutOf(order)
  if (order.status === 'completed' && order.driverSettlementStatus !== 'paid' && driverDue > 0) {
    if (dep > 0 || bal > 0) return 'partially_settled'
    return 'unsettled'
  }
  if (dep > 0 && bal === 0) return 'partially_settled'
  return 'unsettled'
}

function buildOrderFinanceSnapshot(order) {
  const summary = paymentSummary(order)
  const customerTotal = roundMoney(summary.totalPrice)
  const depositPaid = depositPaidAmount(order)
  const balancePaid = balancePaidAmount(order)
  const driverPayable = driverPayoutOf(order)
  const driverPaid =
    order.driverSettlementStatus === 'paid'
      ? roundMoney(order.driverSettlementAmount ?? driverPayable)
      : 0
  const platformProfit = platformProfitOf(order)
  const unsettledAmount =
    order.driverSettlementStatus === 'paid' ? 0 : roundMoney(Math.max(0, driverPayable - driverPaid))
  const refundAmount = refundAmountOf(order)

  return {
    customerTotal,
    depositPaid,
    balancePaid,
    customerPaidTotal: roundMoney(depositPaid + balancePaid),
    driverPayable,
    driverPaid,
    platformProfit,
    unsettledAmount,
    refundAmount,
    settlementStatus: computeSettlementStatus(order)
  }
}

module.exports = {
  buildOrderFinanceSnapshot,
  depositPaidAmount,
  balancePaidAmount,
  driverPayoutOf,
  platformProfitOf,
  phoneOf
}
