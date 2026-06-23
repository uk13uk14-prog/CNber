const Order = require('../models/Order')
const ORDER_STATUS = Order.ORDER_STATUS

const TARGET_ORDER_NOS = [
  'CNB-20260622-001',
  'CNB-20260621-008',
  'CNB-20260621-007'
]

const MATCH = {
  status: ORDER_STATUS.READY_TO_START,
  driverId: null,
  assignedDriver: null,
  dispatchStatus: 'pending'
}

const APPLY_LOG_MESSAGE =
  'Reverted ready_to_start without assigned driver after /api/order/pay guard fix'

function depositIsConfirmed(order) {
  return (
    order.depositStatus === 'confirmed' ||
    order.payment?.depositStatus === 'confirmed'
  )
}

function suggestStatus(order) {
  if (depositIsConfirmed(order)) {
    return {
      status: ORDER_STATUS.DEPOSIT_PAID,
      reason: '定金已 admin 确认，应回到可派单状态 deposit_paid'
    }
  }
  if (
    order.depositStatus === 'submitted' ||
    order.paymentStage === 'deposit_submitted' ||
    order.depositPaid === true
  ) {
    return {
      status: ORDER_STATUS.DEPOSIT_PAID,
      reason:
        '定金已提交或 depositPaid 标记为 true，但未派单；回退到 deposit_paid 等待 admin 确认/派单（保留支付字段）'
    }
  }
  if (order.priceStatus === 'confirmed' || order.status === ORDER_STATUS.CONFIRMED) {
    return {
      status: ORDER_STATUS.CONFIRMED,
      reason: '报价已确认、无有效定金流程，回退到 confirmed'
    }
  }
  return {
    status: ORDER_STATUS.PENDING,
    reason: '无明确定金进度，回退到 pending 等待报价/定金流程'
  }
}

function suggestPaymentStatus(order) {
  const cur = order.paymentStatus || 'unpaid'
  if (depositIsConfirmed(order)) {
    return { paymentStatus: cur === 'paid' ? 'pending' : cur, note: '定金已确认，尾款未结清时不宜标记 paid' }
  }
  if (order.depositPaid === true && order.depositStatus === 'unpaid') {
    return {
      paymentStatus: 'manual_review',
      note: 'depositPaid=true 但 depositStatus=unpaid，建议 manual_review 待人工核对'
    }
  }
  if (order.depositStatus === 'submitted' || order.paymentStage === 'deposit_submitted') {
    return { paymentStatus: 'pending', note: '定金已提交待审，paymentStatus 建议 pending（非 paid）' }
  }
  if (cur === 'paid' && !depositIsConfirmed(order)) {
    return {
      paymentStatus: 'partial',
      note: 'paymentStatus=paid 与 depositStatus 未 confirmed 矛盾，建议改为 partial 待人工复核'
    }
  }
  return { paymentStatus: cur, note: '保留现有 paymentStatus' }
}

function buildApplyUpdate(order) {
  const { status, reason: statusReason } = suggestStatus(order)
  const { paymentStatus, note: paymentNote } = suggestPaymentStatus(order)
  const now = new Date()
  return {
    statusReason,
    paymentNote,
    update: {
      $set: {
        status,
        paymentStatus,
        dispatchStatus: 'pending',
        updatedAt: now
      },
      $push: {
        operationLogs: {
          action: 'system_detected_inconsistent_status',
          operatorId: null,
          operatorPhone: 'system',
          message: APPLY_LOG_MESSAGE,
          createdAt: now
        }
      }
    },
    afterPreview: {
      status,
      paymentStatus,
      dispatchStatus: 'pending',
      updatedAt: now.toISOString()
    }
  }
}

function summarize(order) {
  return {
    orderNo: order.orderNo,
    _id: String(order._id),
    status: order.status,
    dispatchStatus: order.dispatchStatus,
    driverId: order.driverId ? String(order.driverId) : null,
    assignedDriver: order.assignedDriver ? String(order.assignedDriver) : null,
    depositStatus: order.depositStatus,
    balanceStatus: order.balanceStatus,
    paymentStatus: order.paymentStatus,
    paymentStage: order.paymentStage,
    depositPaid: order.depositPaid,
    remainingPaid: order.remainingPaid,
    paidAmount: order.paidAmount,
    depositAmount: order.depositAmount,
    priceStatus: order.priceStatus
  }
}

function matchesTarget(order) {
  if (!order) return false
  return (
    order.status === MATCH.status &&
    !order.driverId &&
    !order.assignedDriver &&
    (order.dispatchStatus || 'pending') === MATCH.dispatchStatus
  )
}

module.exports = {
  TARGET_ORDER_NOS,
  MATCH,
  APPLY_LOG_MESSAGE,
  depositIsConfirmed,
  suggestStatus,
  suggestPaymentStatus,
  buildApplyUpdate,
  summarize,
  matchesTarget
}
