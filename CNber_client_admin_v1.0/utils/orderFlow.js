import {
  normalizeOrderStatus,
  clientOrderFlowSlot,
  clientPagePathForFlowSlot
} from './orderStatus.js'

/**
 * 从订单列表中选「当前应展示」的一单：
 * 优先 pending → assigned → accepted → started；无进行中则取最近一条终态（已完成/已取消）。
 */
export function pickActiveOrder(orders) {
  const list = Array.isArray(orders) ? orders.filter(Boolean) : []
  if (!list.length) return null

  const sorted = [...list].sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime()
    const tb = new Date(b.createdAt || 0).getTime()
    return tb - ta
  })

  const flow = ['pending', 'assigned', 'accepted', 'started']
  for (const st of flow) {
    const subset = sorted.filter((o) => normalizeOrderStatus(o.status) === st)
    if (subset.length) return subset[0]
  }

  // 终态：按「创建时间倒序」取最近一条 completed 或 cancelled（二者不同时伪造优先级）
  for (const o of sorted) {
    const n = normalizeOrderStatus(o.status)
    if (n === 'completed' || n === 'cancelled') return o
  }

  return sorted[0]
}

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
