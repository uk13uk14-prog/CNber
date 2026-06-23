/**
 * 客户端订单状态：与 CNber_backend Order 枚举对齐，并兼容旧状态别名。
 * 文案集中在此，避免各页面硬编码。
 */

/** @typedef {string} NormalizedStatus */

const KNOWN = new Set([
  'created',
  'quoted',
  'confirmed',
  'deposit_paid',
  'assigned',
  'driver_accepted',
  'ready_to_start',
  'in_progress',
  'arrived',
  'completed',
  'cancelled',
  'pending',
  'accepted',
  'started'
])

/**
 * @param {string} [raw]
 * @returns {NormalizedStatus|'unknown'}
 */
export function normalizeOrderStatus(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
  if (!s) return 'unknown'
  if (s === 'ongoing') return 'in_progress'
  if (KNOWN.has(s)) return s
  return 'unknown'
}

/**
 * 流程分组：同一分组共用一页，用于 redirect 去重。
 * @param {string} [rawStatus]
 */
export function clientOrderFlowSlot(rawStatus) {
  const n = normalizeOrderStatus(rawStatus)
  if (
    [
      'pending',
      'created',
      'quoted',
      'confirmed',
      'deposit_paid',
      'assigned'
    ].includes(n)
  ) {
    return 'wait'
  }
  if (['accepted', 'driver_accepted', 'ready_to_start'].includes(n)) {
    return 'driver_info'
  }
  if (['started', 'in_progress', 'arrived'].includes(n)) return 'in_trip'
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

const STATUS_LABELS = {
  created: '待付款',
  quoted: '待付款',
  confirmed: '待付款',
  deposit_paid: '平台安排司机中',
  assigned: '司机已安排',
  driver_accepted: '待出发',
  ready_to_start: '待出发',
  in_progress: '行程中',
  arrived: '行程中',
  completed: '已完成',
  cancelled: '已取消',
  pending: '平台安排司机中',
  accepted: '待出发',
  started: '行程中',
  unknown: '状态未知'
}

/**
 * 短标题：卡片/列表「订单状态」
 * @param {string} [rawStatus]
 */
export function clientOrderStatusLabel(rawStatus) {
  const n = normalizeOrderStatus(rawStatus)
  return STATUS_LABELS[n] || STATUS_LABELS.unknown
}

/**
 * 等待接单页主标题（可与 statusLabel 区分语气）
 */
export function clientWaitPageTitle(rawStatus) {
  const map = {
    pending: '平台安排司机中',
    created: '订单已提交',
    quoted: '待付款',
    confirmed: '待付款',
    deposit_paid: '平台安排司机中',
    assigned: '司机已安排',
    driver_accepted: '待出发',
    ready_to_start: '待出发',
    accepted: '待出发',
    started: '行程进行中',
    in_progress: '行程进行中',
    arrived: '行程进行中',
    completed: '订单已完成',
    cancelled: '订单已取消',
    unknown: '订单状态'
  }
  const n = normalizeOrderStatus(rawStatus)
  return map[n] || map.unknown
}

export function clientOrderWaitingHint(rawStatus) {
  const map = {
    pending: '平台正在为您安排司机，请保持手机畅通。',
    created: '系统已收到预约信息，请完成付款。',
    quoted: '报价已生成，请完成付款。',
    confirmed: '请完成付款，付款确认后平台将安排司机。',
    deposit_paid: '已付款，平台正在安排司机。',
    assigned: '司机已安排，请按预约时间候车。',
    driver_accepted: '请按预约时间在上车点候车。',
    ready_to_start: '请按预约时间候车，司机会提前联系您。',
    accepted: '请按预约时间在上车点候车。',
    started: '行程进行中，请系好安全带。',
    in_progress: '行程进行中，请系好安全带。',
    arrived: '司机已到达，请留意来电。',
    completed: '感谢您的使用，欢迎再次预约。',
    cancelled: '该订单已取消。',
    unknown: '请留意订单状态更新。'
  }
  const n = normalizeOrderStatus(rawStatus)
  return map[n] || map.unknown
}

/** 司机信息页底部提示 */
export function clientDriverInfoNotice(rawStatus) {
  const n = normalizeOrderStatus(rawStatus)
  if (['accepted', 'driver_accepted', 'ready_to_start', 'assigned'].includes(n)) {
    return '司机已安排，请按预约时间候车，保持手机畅通。'
  }
  return '请保持手机畅通，如有问题请及时联系客服。'
}

/** 行程中页顶部一句话 */
export function clientInTripHeadline(rawStatus) {
  const n = normalizeOrderStatus(rawStatus)
  if (['started', 'in_progress', 'arrived'].includes(n)) {
    return '行程进行中，请系好安全带'
  }
  return clientOrderWaitingHint(rawStatus)
}

/** 列表/历史行展示用时间 */
export function formatOrderListTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
