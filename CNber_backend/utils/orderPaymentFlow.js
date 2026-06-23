const { paymentSummary, roundMoney } = require('./pricing')

/**
 * 派单前：新流程 depositStatus=confirmed，或旧单仅看 depositPaid
 */
function canDispatchByDeposit(order) {
  if (!order) return false
  if (order.payment?.depositStatus === 'confirmed') return true
  if (order.depositStatus === 'confirmed') return true
  if (!order.paymentStage || order.paymentStage === 'none') {
    return paymentSummary(order).depositPaid
  }
  return false
}

function newOrderManualPaymentDefaults() {
  return {
    paymentStage: 'deposit_pending',
    depositStatus: 'unpaid',
    balanceStatus: 'unpaid',
    payment: {
      depositStatus: 'unpaid',
      balanceStatus: 'unpaid',
      depositConfirmedAt: null,
      balanceConfirmedAt: null,
      depositAmount: 0,
      balanceAmount: 0,
      paymentNote: ''
    },
    depositPaymentInfo: {},
    balancePaymentInfo: {},
    driverSettlementStatus: 'not_required',
    driverSettlementAmount: null,
    driverSettlementConfirmedAt: null,
    driverSettlementConfirmedBy: null,
    totalAmount: null,
    balanceAmount: 0
  }
}

/** 报价成功后写入金额并进入待付定金 */
function quotedManualPaymentAmounts(totalPrice) {
  const total = roundMoney(totalPrice)
  const depositAmount = roundMoney(total * 0.1)
  const balanceAmount = roundMoney(total - depositAmount)
  return {
    totalAmount: total,
    depositAmount,
    remainingAmount: balanceAmount,
    balanceAmount,
    paymentStage: 'deposit_pending',
    depositStatus: 'unpaid',
    balanceStatus: 'unpaid',
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

const READY_TO_START = 'ready_to_start'

function orderHasAssignedDriver(order) {
  if (!order) return false
  const d = order.driverId
  const a = order.assignedDriver
  return Boolean(d || a)
}

/** 无司机时从 patch 中移除 ready_to_start，防止支付接口越权推进状态 */
function applyReadyToStartStatus(order, patch) {
  if (!patch || patch.status !== READY_TO_START) return patch
  if (orderHasAssignedDriver(order)) return patch
  const next = { ...patch }
  delete next.status
  return next
}

function assertReadyToStartAllowed(order, nextStatus) {
  if (nextStatus !== READY_TO_START) return
  if (!orderHasAssignedDriver(order)) {
    const e = new Error('订单未派司机，不能进入待出发状态')
    e.code = 400
    throw e
  }
}

module.exports = {
  canDispatchByDeposit,
  newOrderManualPaymentDefaults,
  quotedManualPaymentAmounts,
  orderHasAssignedDriver,
  applyReadyToStartStatus,
  assertReadyToStartAllowed,
  READY_TO_START
}
