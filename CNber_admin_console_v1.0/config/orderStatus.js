/**
 * 订单 UI 状态：与后端 Order 组合映射，禁止在页面硬编码文案/颜色
 *
 * 后端主状态：pending | assigned | accepted | started | completed | cancelled
 * 扩展字段：paymentStatus unpaid | paid
 */

export const UI_ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  WAITING_DRIVER: 'waiting_driver',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

/** @type {Record<string, { label: string, color: string, bg: string }>} */
export const UI_ORDER_STATUS_META = {
  [UI_ORDER_STATUS.PENDING]: {
    label: '待指派',
    color: '#667085',
    bg: '#f2f4f7'
  },
  [UI_ORDER_STATUS.PAID]: {
    label: '已支付',
    color: '#1677ff',
    bg: '#e8f3ff'
  },
  [UI_ORDER_STATUS.WAITING_DRIVER]: {
    label: '待指派',
    color: '#f79009',
    bg: '#fff4e5'
  },
  [UI_ORDER_STATUS.ASSIGNED]: {
    label: '已指派',
    color: '#1677ff',
    bg: '#e8f3ff'
  },
  [UI_ORDER_STATUS.ACCEPTED]: {
    label: '已接单',
    color: '#1677ff',
    bg: '#e8f3ff'
  },
  [UI_ORDER_STATUS.IN_PROGRESS]: {
    label: '行程中',
    color: '#7c3aed',
    bg: '#f3e8ff'
  },
  [UI_ORDER_STATUS.COMPLETED]: {
    label: '已完成',
    color: '#12b76a',
    bg: '#e8faf0'
  },
  [UI_ORDER_STATUS.CANCELLED]: {
    label: '已取消',
    color: '#f04438',
    bg: '#fee4e2'
  }
}

/**
 * 将后端订单文档映射为 UI 状态 key
 * @param {Record<string, any>} order
 */
export function mapOrderToUiStatus(order) {
  if (!order) return UI_ORDER_STATUS.PENDING
  const s = order.status
  if (s === 'cancelled') return UI_ORDER_STATUS.CANCELLED
  if (s === 'completed') return UI_ORDER_STATUS.COMPLETED
  if (s === 'started') return UI_ORDER_STATUS.IN_PROGRESS
  if (s === 'accepted') return UI_ORDER_STATUS.ACCEPTED
  if (s === 'assigned') return UI_ORDER_STATUS.ASSIGNED
  if (s === 'pending') {
    const paid = order.paymentStatus === 'paid'
    const hasDriver =
      order.driverId &&
      (typeof order.driverId === 'string' || order.driverId._id)
    if (hasDriver) return UI_ORDER_STATUS.ASSIGNED
    if (paid) return UI_ORDER_STATUS.PAID
    return UI_ORDER_STATUS.WAITING_DRIVER
  }
  return UI_ORDER_STATUS.PENDING
}

export function getUiStatusMeta(uiKey) {
  return UI_ORDER_STATUS_META[uiKey] || UI_ORDER_STATUS_META[UI_ORDER_STATUS.PENDING]
}

/**
 * 列表筛选：UI key -> 请求 query（对接 GET /order/list）
 * @param {string} uiKey
 */
export function uiStatusToListQuery(uiKey) {
  if (!uiKey || uiKey === 'all') return {}
  if (uiKey === UI_ORDER_STATUS.WAITING_DRIVER) {
    return { status: 'pending', paymentStatus: 'unpaid' }
  }
  if (uiKey === UI_ORDER_STATUS.PAID) {
    return { status: 'pending', paymentStatus: 'paid' }
  }
  if (uiKey === UI_ORDER_STATUS.ASSIGNED) {
    // TODO: 后端支持 pending + driverId 非空筛选后改为精确查询
    return { status: 'pending' }
  }
  if (uiKey === UI_ORDER_STATUS.ACCEPTED) return { status: 'accepted' }
  if (uiKey === UI_ORDER_STATUS.IN_PROGRESS) return { status: 'started' }
  if (uiKey === UI_ORDER_STATUS.COMPLETED) return { status: 'completed' }
  if (uiKey === UI_ORDER_STATUS.CANCELLED) return { status: 'cancelled' }
  if (uiKey === UI_ORDER_STATUS.PENDING) {
    return { status: 'pending' }
  }
  return {}
}

/** 筛选项展示 */
export const ORDER_FILTER_TABS = [
  { key: 'all', label: '全部' },
  { key: UI_ORDER_STATUS.WAITING_DRIVER, label: '待指派' },
  { key: UI_ORDER_STATUS.PAID, label: '已支付' },
  { key: UI_ORDER_STATUS.ACCEPTED, label: '已接单' },
  { key: UI_ORDER_STATUS.IN_PROGRESS, label: '行程中' },
  { key: UI_ORDER_STATUS.COMPLETED, label: '已完成' },
  { key: UI_ORDER_STATUS.CANCELLED, label: '已取消' }
]
