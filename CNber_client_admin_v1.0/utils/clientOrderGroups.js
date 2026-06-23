import { normalizeOrderStatus } from './orderStatus.js'
import { clientV1PaymentLabel } from './clientBookingFlow.js'

/** 当前订单页展示优先级（高 → 低） */
export function clientOrderPriorityScore(order) {
  if (!order) return -1
  const n = normalizeOrderStatus(order.status)
  const pay = clientV1PaymentLabel(order)

  if (['started', 'in_progress', 'arrived'].includes(n)) return 100
  if (['accepted', 'driver_accepted', 'ready_to_start'].includes(n)) return 90
  if (n === 'assigned') return 80
  if (pay === '已付款') return 70
  if (pay === '付款待确认') return 40
  if (pay === '待付款') return 20
  if (n === 'completed') return 5
  if (n === 'cancelled') return 1
  return 10
}

/**
 * 从列表选「当前应展示」订单：
 * 优先 进行中 → 待出发 → 已派单 → 已付款待安排 → 付款待确认 → 待付款；
 * 不因较新的未付款旧单挡住已付款/已派单订单。
 */
export function pickActiveOrder(orders) {
  const list = Array.isArray(orders) ? orders.filter(Boolean) : []
  if (!list.length) return null

  const sorted = [...list].sort((a, b) => {
    const diff = clientOrderPriorityScore(b) - clientOrderPriorityScore(a)
    if (diff !== 0) return diff
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  })

  const actionable = sorted.filter((o) => clientOrderPriorityScore(o) >= 20)
  if (actionable.length) return actionable[0]

  return sorted[0]
}

export const CLIENT_HISTORY_TABS = [
  { id: 'unpaid', label: '待付款' },
  { id: 'active', label: '已付款/处理中' },
  { id: 'completed', label: '已完成' },
  { id: 'cancelled', label: '已取消' }
]

/** 订单历史 Tab 分组 */
export function clientOrderHistoryTab(order) {
  const n = normalizeOrderStatus(order?.status)
  const pay = clientV1PaymentLabel(order)
  if (n === 'cancelled') return 'cancelled'
  if (n === 'completed') return 'completed'
  if (pay === '待付款' && ['created', 'quoted', 'confirmed', 'pending'].includes(n)) {
    return 'unpaid'
  }
  return 'active'
}

export function filterOrdersByHistoryTab(orders, tabId) {
  if (!tabId) return orders || []
  return (orders || []).filter((o) => clientOrderHistoryTab(o) === tabId)
}
