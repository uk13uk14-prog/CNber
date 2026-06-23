const { paymentSummary, roundMoney } = require('./pricing')

const MVP_DEPOSIT = ['unpaid', 'pending', 'confirmed']
const MVP_BALANCE = ['unpaid', 'pending', 'confirmed']

function mapToMvpStatus(status) {
  if (status === 'submitted') return 'pending'
  if (status === 'rejected') return 'unpaid'
  if (MVP_DEPOSIT.includes(status)) return status
  return 'unpaid'
}

function ensurePaymentBlock(order = {}) {
  const summary = paymentSummary(order)
  const existing = order.payment || {}
  return {
    depositStatus: mapToMvpStatus(existing.depositStatus || order.depositStatus),
    balanceStatus: mapToMvpStatus(existing.balanceStatus || order.balanceStatus),
    depositConfirmedAt:
      existing.depositConfirmedAt ||
      order.depositPaymentInfo?.confirmedAt ||
      null,
    balanceConfirmedAt:
      existing.balanceConfirmedAt ||
      order.balancePaymentInfo?.confirmedAt ||
      null,
    depositAmount: roundMoney(
      existing.depositAmount ?? order.depositAmount ?? summary.depositAmount
    ),
    balanceAmount: roundMoney(
      existing.balanceAmount ?? order.balanceAmount ?? summary.balanceAmount
    ),
    paymentNote: String(existing.paymentNote || '').trim()
  }
}

/** 列表/详情响应：附带规范化 payment 块 */
function attachPaymentToOrder(order) {
  if (!order || typeof order !== 'object') return order
  const payment = ensurePaymentBlock(order)
  return { ...order, payment }
}

function initialPaymentFields(totalPrice) {
  const total = roundMoney(totalPrice)
  const depositAmount = roundMoney(total * 0.1)
  const balanceAmount = roundMoney(total - depositAmount)
  return {
    depositAmount,
    balanceAmount,
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

function legacyDepositStatus(mvpStatus) {
  if (mvpStatus === 'pending') return 'submitted'
  return mvpStatus
}

function buildDepositConfirmedSet(order, adminUserId) {
  const summary = paymentSummary(order)
  const now = new Date()
  const depositAmount = roundMoney(
    order.payment?.depositAmount ?? order.depositAmount ?? summary.depositAmount
  )
  return {
    depositPaid: true,
    depositAmount,
    remainingAmount: summary.remainingAmount,
    balanceAmount: summary.balanceAmount,
    totalAmount: summary.totalAmount,
    paidAmount: depositAmount,
    paymentStatus: 'pending',
    depositStatus: 'confirmed',
    paymentStage: 'deposit_confirmed',
    'depositPaymentInfo.confirmedAt': now,
    'depositPaymentInfo.confirmedBy': adminUserId || null,
    depositConfirmedAt: now,
    depositConfirmedBy: adminUserId || null,
    settlementStatus: 'partially_settled',
    payment: {
      depositStatus: 'confirmed',
      balanceStatus: mapToMvpStatus(order.payment?.balanceStatus || order.balanceStatus),
      depositConfirmedAt: now,
      balanceConfirmedAt: order.payment?.balanceConfirmedAt || null,
      depositAmount,
      balanceAmount: roundMoney(
        order.payment?.balanceAmount ?? order.balanceAmount ?? summary.balanceAmount
      ),
      paymentNote: order.payment?.paymentNote || ''
    },
    updatedAt: now
  }
}

function buildBalanceConfirmedSet(order, adminUserId) {
  const summary = paymentSummary(order)
  const now = new Date()
  const depositAmount = roundMoney(
    order.payment?.depositAmount ?? order.depositAmount ?? summary.depositAmount
  )
  const balanceAmount = roundMoney(
    order.payment?.balanceAmount ?? order.balanceAmount ?? summary.balanceAmount
  )
  return {
    depositPaid: true,
    remainingPaid: true,
    depositAmount,
    remainingAmount: summary.remainingAmount,
    balanceAmount,
    totalAmount: summary.totalAmount,
    paidAmount: summary.totalPrice,
    paymentStatus: 'paid',
    balanceStatus: 'confirmed',
    paymentStage: 'balance_confirmed',
    'balancePaymentInfo.confirmedAt': now,
    'balancePaymentInfo.confirmedBy': adminUserId || null,
    balanceConfirmedAt: now,
    balanceConfirmedBy: adminUserId || null,
    settlementStatus: 'settled',
    payment: {
      depositStatus: 'confirmed',
      balanceStatus: 'confirmed',
      depositConfirmedAt:
        order.payment?.depositConfirmedAt ||
        order.depositPaymentInfo?.confirmedAt ||
        now,
      balanceConfirmedAt: now,
      depositAmount,
      balanceAmount,
      paymentNote: order.payment?.paymentNote || ''
    },
    updatedAt: now
  }
}

function canConfirmDeposit(order) {
  if (!order) return false

  const depositStatus = String(order.depositStatus || '').trim()
  const paymentStage = order.paymentStage || 'none'

  if (depositStatus === 'confirmed') return false
  if (depositStatus === 'submitted') return true
  if (paymentStage === 'deposit_submitted') return true

  if (!order.paymentStage || paymentStage === 'none') {
    const st = mapToMvpStatus(order.payment?.depositStatus || order.depositStatus)
    if (st === 'confirmed') return false
    return !order.depositPaid
  }

  return false
}

function canConfirmBalance(order) {
  const dep = mapToMvpStatus(order.payment?.depositStatus || order.depositStatus)
  if (dep !== 'confirmed' && !order.depositPaid) return false
  const bal = mapToMvpStatus(order.payment?.balanceStatus || order.balanceStatus)
  return bal !== 'confirmed' && !order.remainingPaid
}

module.exports = {
  MVP_DEPOSIT,
  MVP_BALANCE,
  mapToMvpStatus,
  legacyDepositStatus,
  ensurePaymentBlock,
  attachPaymentToOrder,
  initialPaymentFields,
  buildDepositConfirmedSet,
  buildBalanceConfirmedSet,
  canConfirmDeposit,
  canConfirmBalance
}
