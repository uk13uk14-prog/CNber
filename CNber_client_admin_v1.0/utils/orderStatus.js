/**
 * 客户端订单状态：与 CNber_backend Order 枚举对齐，并兼容进行中别名。
 * 文案集中在此，避免各页面硬编码。
 */

/** @typedef {'pending'|'assigned'|'accepted'|'started'|'completed'|'cancelled'|'unknown'} NormalizedStatus */

/**
 * @param {string} [raw]
 * @returns {NormalizedStatus}
 */
export function normalizeOrderStatus(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
  if (s === 'in_progress' || s === 'ongoing') return 'started'
  if (
    s === 'pending' ||
    s === 'assigned' ||
    s === 'accepted' ||
    s === 'started' ||
    s === 'completed' ||
    s === 'cancelled'
  ) {
    return s
  }
  return 'unknown'
}

/**
 * 流程分组：同一分组共用一页，用于 redirect 去重（如 pending→assigned 不换页）
 * 规则：cancelled 永不进入完成页（completed 槽位），统一进历史列表 A0202。
 * @param {string} [rawStatus]
 */
export function clientOrderFlowSlot(rawStatus) {
  const n = normalizeOrderStatus(rawStatus)
  if (n === 'pending' || n === 'assigned') return 'wait'
  if (n === 'accepted') return 'driver_info'
  if (n === 'started') return 'in_trip'
  if (n === 'completed') return 'completed'
  if (n === 'cancelled') return 'history'
  return 'unknown'
}

export const CLIENT_ORDER_PAGE_PATHS = {
  wait: '/pages/A0107_client_wait_driver_v01',
  driver_info: '/pages/A0109_client_driver_info_v01',
  in_trip: '/pages/A0110_client_in_trip_v01',
  completed: '/pages/A0111_client_trip_completed_v01',
  history: '/pages/A0202_client_order_history_v01'
}

/**
 * @param {string} slot clientOrderFlowSlot 返回值
 * @returns {string}
 */
export function clientPagePathForFlowSlot(slot) {
  return CLIENT_ORDER_PAGE_PATHS[slot] || ''
}

/**
 * 短标题：卡片/列表「订单状态」
 * @param {string} [rawStatus]
 */
export function clientOrderStatusLabel(rawStatus) {
  const n = normalizeOrderStatus(rawStatus)
  const map = {
    pending: '待指派',
    assigned: '已指派',
    accepted: '已接单',
    started: '行程中',
    completed: '已完成',
    cancelled: '已取消',
    unknown: '状态未知'
  }
  return map[n] || map.unknown
}

/**
 * 等待接单页主标题（可与 statusLabel 区分语气）
 */
export function clientWaitPageTitle(rawStatus) {
  const n = normalizeOrderStatus(rawStatus)
  if (n === 'pending') return '正在为您安排司机'
  if (n === 'assigned') return '已分配司机'
  if (n === 'accepted') return '司机已接单'
  if (n === 'started') return '行程进行中'
  if (n === 'completed') return '订单已完成'
  if (n === 'cancelled') return '订单已取消'
  return '订单状态'
}

/**
 * 等待/加载区副文案
 */
export function clientOrderWaitingHint(rawStatus) {
  const n = normalizeOrderStatus(rawStatus)
  if (n === 'pending') return '系统正在为您安排司机，请耐心等待……'
  if (n === 'assigned')
    return '订单已分配司机，等待司机确认接单，请稍候……'
  if (n === 'accepted') return '司机已接单，正在准备前往上车点。'
  if (n === 'started') return '您的行程正在进行中。'
  if (n === 'completed') return '感谢您的使用，欢迎再次下单。'
  if (n === 'cancelled') return '该订单已取消，您可在订单历史中查看。'
  return '暂无订单状态信息。'
}

/** 司机信息页底部提示 */
export function clientDriverInfoNotice(rawStatus) {
  const n = normalizeOrderStatus(rawStatus)
  if (n === 'accepted') {
    return '司机已接单，请保持手机畅通，司机将在预计时间内到达上车地点。'
  }
  return '请保持手机畅通，如有问题请及时联系客服。'
}

/** 行程中页顶部一句话 */
export function clientInTripHeadline(rawStatus) {
  const n = normalizeOrderStatus(rawStatus)
  if (n === 'started') return '行程进行中，请系好安全带'
  return clientOrderWaitingHint(rawStatus)
}

/** 列表/历史行展示用时间 */
export function formatOrderListTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
