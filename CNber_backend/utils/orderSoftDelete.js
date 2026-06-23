const Order = require('../models/Order')
const { canDispatchByDeposit } = require('./orderPaymentFlow')

const ORDER_STATUS = Order.ORDER_STATUS

const BLOCKED_STATUSES = new Set([
  ORDER_STATUS.DEPOSIT_PAID,
  ORDER_STATUS.ASSIGNED,
  ORDER_STATUS.DRIVER_ACCEPTED,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.READY_TO_START,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.STARTED,
  ORDER_STATUS.ARRIVED,
  ORDER_STATUS.COMPLETED
])

function hasAssignedDriver(order = {}) {
  return !!(order.driverId || order.assignedDriver)
}

function hasPaidOrPendingPayment(order = {}) {
  if (canDispatchByDeposit(order)) return true
  if (order.depositPaid === true) return true
  if (order.paymentStatus === 'paid') return true
  if (['confirmed', 'submitted', 'pending'].includes(order.depositStatus || '')) return true
  if (['confirmed', 'pending'].includes(order.payment?.depositStatus || '')) return true
  if (order.paymentStage && !['none', 'deposit_pending'].includes(order.paymentStage)) {
    return true
  }
  return false
}

/** 是否允许软删除（不物理删除文档） */
function canSoftDeleteOrder(order = {}) {
  if (!order || !order._id) {
    return { ok: false, message: '订单不存在' }
  }
  if (order.isDeleted) {
    return { ok: false, message: '订单已归档删除' }
  }
  if (hasAssignedDriver(order)) {
    return { ok: false, message: '已指派司机，请先取消派单后再删除' }
  }
  if (hasPaidOrPendingPayment(order)) {
    return { ok: false, message: '已付款或付款待确认的订单不可删除' }
  }
  if (BLOCKED_STATUSES.has(order.status)) {
    return { ok: false, message: '当前状态不可删除，请先取消订单或取消派单' }
  }
  if (order.driverSettlementStatus === 'paid') {
    return { ok: false, message: '司机已结算，不可删除' }
  }
  return { ok: true }
}

function activeOrdersFilter() {
  return { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] }
}

module.exports = {
  canSoftDeleteOrder,
  activeOrdersFilter,
  hasAssignedDriver,
  hasPaidOrPendingPayment
}
