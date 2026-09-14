/**
 * Admin V1 预约用车 — 列表主状态 / 付款状态 / 操作阶段
 */
import { depositConfirmedForDispatch, depositSubmittedPendingConfirm } from './depositDispatch'

export function adminPaymentConfirmed(order) {
  if (!order) return false
  if (depositConfirmedForDispatch(order)) return true
  if (order.paymentStatus === 'paid') return true
  return false
}

export function adminPaymentPendingReview(order) {
  if (!order) return false
  return depositSubmittedPendingConfirm(order) || order.paymentStatus === 'manual_review'
}

/** 付款状态列 */
export function adminPaymentStatusLabel(order) {
  if (!order) return '—'
  if (adminPaymentPendingReview(order)) return '付款待确认'
  if (adminPaymentConfirmed(order)) return '已付款'
  return '待付款'
}

/**
 * 主状态列（运营可读）
 */
export function adminBookingStatusLabel(order) {
  if (!order) return '—'
  const s = order.status || ''

  if (s === 'cancelled') return '已取消'
  if (s === 'completed') return '已完成'
  if (s === 'needs_redispatch' || order.dispatchStatus === 'needs_redispatch') return '待重新派单'
  if (['started', 'in_progress', 'arrived'].includes(s)) return '行程中'
  if (['accepted', 'driver_accepted', 'ready_to_start'].includes(s)) return '待出发'
  if (s === 'assigned' || order.driverId || order.assignedDriver) return '已派单'
  if (adminPaymentPendingReview(order)) return '付款待确认'
  if (adminPaymentConfirmed(order)) return '已付款，待派单'
  return '待付款'
}

export function adminBookingStatusClass(order) {
  const label = adminBookingStatusLabel(order)
  if (label === '待付款') return 'status-orange'
  if (label === '付款待确认') return 'status-blue'
  if (label === '已付款，待派单' || label === '待重新派单') return 'status-green'
  if (label === '已派单' || label === '待出发') return 'status-blue'
  if (label === '行程中') return 'status-purple'
  if (label === '已完成' || label === '已取消') return 'status-gray'
  return 'status-gray'
}

/**
 * 列表操作区阶段
 */
export function adminOrderUiStage(order) {
  if (!order?._id) return 'terminal'
  const s = order.status || ''

  if (['completed', 'cancelled'].includes(s)) return 'terminal'
  if (s === 'needs_redispatch' || order.dispatchStatus === 'needs_redispatch') return 'needs_redispatch'
  if (['started', 'in_progress', 'arrived', 'accepted', 'driver_accepted', 'ready_to_start'].includes(s)) {
    return 'in_trip'
  }
  if (s === 'assigned' || order.driverId || order.assignedDriver) return 'assigned'
  if (adminPaymentPendingReview(order)) return 'payment_review'
  if (adminPaymentConfirmed(order)) return 'ready_dispatch'
  return 'await_payment'
}

/** 预约时间：从 pickupDetail / dropoffDetail 解析 */
export function adminScheduledTimeLabel(order) {
  if (!order) return '—'
  const text = [order.pickupDetail, order.dropoffDetail].filter(Boolean).join(' ')
  const m = String(text).match(/(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})/)
  if (m) return `${m[1]} ${m[2]}`
  return '—'
}

/** 调度中心 Tab（与 adminOrderUiStage 对齐，排除 terminal） */
export const DISPATCH_CENTER_TABS = [
  { id: 'await_payment', label: '待付款' },
  { id: 'payment_review', label: '付款待确认' },
  { id: 'needs_redispatch', label: '待重新派单' },
  { id: 'ready_dispatch', label: '待派单' },
  { id: 'assigned', label: '已派单 / 待出发' },
  { id: 'in_trip', label: '进行中' }
]

export function dispatchCenterTab(order) {
  const stage = adminOrderUiStage(order)
  if (stage === 'terminal') return null
  return stage
}

export function filterOrdersByDispatchTab(orders, tabId) {
  if (!tabId) return (orders || []).filter((o) => dispatchCenterTab(o))
  return (orders || []).filter((o) => dispatchCenterTab(o) === tabId)
}

export function orderDisplayNo(order) {
  if (!order) return '—'
  if (order.orderNo) return order.orderNo
  const id = order._id ? String(order._id) : ''
  return id ? `旧单-${id.slice(-8)}` : '—'
}

export function phoneOf(ref) {
  if (!ref) return '—'
  if (typeof ref === 'object' && ref.phone) return ref.phone
  return '—'
}

export function driverInfoLine(order) {
  if (!order?.driverId && !order?.assignedDriver) return '—'
  const parts = []
  const name = order.assignedDriverName || order.assignedDriver?.driverProfile?.realName
  const phone =
    order.assignedDriverPhone ||
    phoneOf(order.assignedDriver) ||
    phoneOf(order.driverId)
  const plate =
    order.assignedDriver?.driverProfile?.vehiclePlate ||
    order.assignedDriver?.driverProfile?.vehicle?.plateNo ||
    ''
  if (name) parts.push(name)
  if (phone && phone !== '—') parts.push(phone)
  if (plate) parts.push(plate)
  return parts.length ? parts.join(' / ') : '已指派'
}

/** 列表「删除」按钮：仅未付款、未派单、非进行中 */
export function canAdminSoftDeleteOrder(order) {
  if (!order?._id || order.isDeleted) return false
  if (order.driverId || order.assignedDriver) return false
  if (adminPaymentConfirmed(order) || adminPaymentPendingReview(order)) return false
  const stage = adminOrderUiStage(order)
  if (stage === 'await_payment') return true
  if (order.status === 'cancelled' && stage === 'terminal') return true
  return false
}
