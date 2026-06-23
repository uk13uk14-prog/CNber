import {
  normalizeOrderStatus,
  clientOrderFlowSlot,
  clientPagePathForFlowSlot,
  CLIENT_ORDER_PAGE_PATHS
} from './orderStatus.js'
import { pickActiveOrder } from './clientOrderGroups.js'

export { pickActiveOrder }

/**
 * 按流程分组跳转页面；同组内（如 pending→assigned）不 redirect，避免闪屏。
 * @param {import('vue').Ref<string>} lastFlowSlotRef
 * @param {{ status?: string } | null} [order]
 */
export function applyClientOrderRoute(order, lastFlowSlotRef) {
  if (!order || !order.status) {
    lastFlowSlotRef.value = ''
    return
  }

  const slot = clientOrderFlowSlot(order.status)
  const targetUrl = clientPagePathForFlowSlot(slot)
  if (!targetUrl) {
    lastFlowSlotRef.value = slot
    return
  }

  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const currentRoute = pages.length ? pages[pages.length - 1].route : ''
  const currentPath = currentRoute ? `/${currentRoute}` : ''

  const flowPaths = new Set(Object.values(CLIENT_ORDER_PAGE_PATHS || {}))
  if (flowPaths.size && currentPath && !flowPaths.has(currentPath)) {
    lastFlowSlotRef.value = slot
    return
  }

  if (currentPath !== targetUrl) {
    lastFlowSlotRef.value = slot
    uni.redirectTo({ url: targetUrl })
    return
  }

  lastFlowSlotRef.value = slot
}

/**
 * 根据订单上的 driverId（populate 后为 { phone }）生成展示用司机信息
 */
export function driverDisplayFromOrder(order) {
  const fallback = {
    name: '司机',
    phone: '—',
    vehicle: '车辆信息请咨询司机',
    plateNumber: '—',
    rating: '5.0',
    avatar: '/static/driver_avatar.png'
  }
  if (!order || !order.driverId) return fallback
  const d = order.driverId
  if (d && typeof d === 'object' && d.phone) {
    return {
      name: `司机（尾号${String(d.phone).slice(-4)}）`,
      phone: String(d.phone),
      vehicle: fallback.vehicle,
      plateNumber: fallback.plateNumber,
      rating: fallback.rating,
      avatar: fallback.avatar
    }
  }
  return { ...fallback, phone: String(d) }
}
