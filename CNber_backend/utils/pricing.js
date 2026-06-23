function roundMoney(value) {
  const n = Number(value || 0)
  return Math.round(n * 100) / 100
}

function totalPriceOf(order = {}) {
  return roundMoney(
    order.priceBreakdown?.totalPrice ??
      order.quoteBreakdown?.totalPrice ??
      order.quoteBreakdown?.total ??
      order.amount ??
      0
  )
}

function buildPaymentFields(totalPrice) {
  const total = roundMoney(totalPrice)
  const depositAmount = roundMoney(total * 0.1)
  const remainingAmount = roundMoney(total - depositAmount)
  const balanceAmount = remainingAmount
  return {
    depositAmount,
    remainingAmount,
    balanceAmount,
    totalAmount: total,
    depositPaid: false,
    remainingPaid: false,
    paidAmount: 0,
    depositStatus: 'unpaid',
    balanceStatus: 'unpaid',
    paymentStage: 'none',
    payment: {
      depositStatus: 'unpaid',
      balanceStatus: 'unpaid',
      depositConfirmedAt: null,
      balanceConfirmedAt: null,
      depositAmount,
      balanceAmount,
      paymentNote: ''
    }
  }
}

function buildPriceBreakdown(totalPrice, source = {}) {
  const total = roundMoney(totalPrice)
  const existing = source.priceBreakdown || source.quoteBreakdown || {}
  const driverPayout = roundMoney(
    existing.driverPayout ??
      source.driverPayout ??
      (Number.isFinite(total) ? total * 0.75 : 0)
  )
  return {
    basePrice: roundMoney(existing.basePrice ?? existing.baseFare ?? existing.price ?? total),
    nightFee: roundMoney(existing.nightFee ?? existing.nightSurcharge ?? 0),
    waitingFee: roundMoney(existing.waitingFee ?? 0),
    childSeatFee: roundMoney(existing.childSeatFee ?? 0),
    meetGreetFee: roundMoney(existing.meetGreetFee ?? existing.airportSurcharge ?? 0),
    totalPrice: total,
    driverPayout,
    platformProfit: roundMoney(total - driverPayout)
  }
}

function buildQuotePatch(amount, source = {}) {
  const total = roundMoney(amount)
  return {
    amount: total,
    priceBreakdown: buildPriceBreakdown(total, source),
    ...buildPaymentFields(total)
  }
}

function paymentSummary(order = {}) {
  const total = totalPriceOf(order)
  const fallback = buildPaymentFields(total)
  const depositAmount = roundMoney(order.depositAmount ?? fallback.depositAmount)
  const remainingAmount = roundMoney(order.remainingAmount ?? fallback.remainingAmount)
  const balanceAmount = roundMoney(
    order.balanceAmount != null ? order.balanceAmount : remainingAmount
  )
  const totalAmount = roundMoney(
    order.totalAmount != null ? order.totalAmount : total
  )
  const depositPaidLegacy = Boolean(
    order.depositPaid ||
      order.paymentStatus === 'paid' ||
      order.depositStatus === 'confirmed'
  )
  return {
    totalPrice: total,
    totalAmount,
    depositAmount,
    remainingAmount,
    balanceAmount,
    depositPaid: depositPaidLegacy,
    remainingPaid: Boolean(order.remainingPaid || order.paymentStatus === 'paid'),
    paidAmount: roundMoney(order.paidAmount ?? (order.paymentStatus === 'paid' ? total : 0))
  }
}

module.exports = {
  roundMoney,
  totalPriceOf,
  buildPaymentFields,
  buildPriceBreakdown,
  buildQuotePatch,
  paymentSummary
}
