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

export function adminPaymentStatusLabel(order) {
  if (!order) return '—'
  if (adminPaymentPendingReview(order)) return '付款待确认'
  if (adminPaymentConfirmed(order)) return '已付款'
  return '待付款'
}

export function adminBookingStatusLabel(order) {
  if (!order) return '—'
  const s = order.status || ''
  if (s === 'cancelled') return '已取消'
  if (s === 'completed') return '已完成'
  if (['started', 'in_progress', 'arrived'].includes(s)) return '行程中'
  if (['accepted', 'driver_accepted', 'ready_to_start'].includes(s)) return '待出发'
  if (s === 'assigned' || order.driverId || order.assignedDriver) return '已派单'
  if (adminPaymentPendingReview(order)) return '付款待确认'
  if (adminPaymentConfirmed(order)) return '已付款，待派单'
  return '待付款'
}

export function adminOrderUiStage(order) {
  if (!order?._id) return 'terminal'
  const s = order.status || ''
  if (['completed', 'cancelled'].includes(s)) return 'terminal'
  if (['started', 'in_progress', 'arrived', 'accepted', 'driver_accepted', 'ready_to_start'].includes(s)) {
    return 'in_trip'
  }
  if (s === 'assigned' || order.driverId || order.assignedDriver) return 'assigned'
  if (adminPaymentPendingReview(order)) return 'payment_review'
  if (adminPaymentConfirmed(order)) return 'ready_dispatch'
  return 'await_payment'
}

export function adminScheduledTimeLabel(order) {
  if (!order) return '—'
  const text = [order.pickupDetail, order.dropoffDetail].filter(Boolean).join(' ')
  const m = String(text).match(/(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})/)
  if (m) return `${m[1]} ${m[2]}`
  if (order.scheduledAt) {
    const d = new Date(order.scheduledAt)
    if (!isNaN(d.getTime())) return d.toLocaleString('zh-CN')
  }
  return '—'
}

export const DISPATCH_MOBILE_TABS = [
  { id: 'payment_review', label: '付款待确认' },
  { id: 'ready_dispatch', label: '待派单' },
  { id: 'assigned', label: '已派单/待出发' },
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
  if (!ref) return ''
  if (typeof ref === 'string') return ref
  if (typeof ref === 'object' && ref.phone) return ref.phone
  return ''
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
  if (phone) parts.push(phone)
  if (plate) parts.push(plate)
  return parts.length ? parts.join(' / ') : '已指派'
}

export function driverPhoneOf(order) {
  return (
    order.assignedDriverPhone ||
    phoneOf(order.assignedDriver) ||
    phoneOf(order.driverId) ||
    ''
  )
}
