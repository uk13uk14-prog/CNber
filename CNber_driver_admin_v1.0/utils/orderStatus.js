/**
 * 司机端 V1 预约用车状态文案
 */

const LABELS = {
  pending: '待执行',
  created: '待执行',
  quoted: '待执行',
  confirmed: '待执行',
  deposit_paid: '待执行',
  assigned: '待执行',
  driver_accepted: '待执行',
  ready_to_start: '待执行',
  accepted: '待执行',
  started: '进行中',
  ongoing: '进行中',
  in_progress: '进行中',
  arrived: '进行中',
  completed: '已完成',
  cancelled: '已取消',
  needs_redispatch: '待重新派单'
}

export function normalizeDriverOrderStatus(status) {
  const s = String(status || '').trim()
  if (!s) return ''
  if (s === 'ongoing' || s === 'in_progress' || s === 'arrived') return 'started'
  if (
    [
      'driver_accepted',
      'ready_to_start',
      'assigned',
      'deposit_paid',
      'confirmed',
      'quoted',
      'created',
      'pending',
      'accepted'
    ].includes(s)
  ) {
    return 'accepted'
  }
  return s
}

export function formatDriverOrderStatus(status) {
  if (!status) return '未知'
  const raw = String(status).trim()
  if (LABELS[raw]) return LABELS[raw]
  const n = normalizeDriverOrderStatus(raw)
  return LABELS[n] || LABELS[raw] || raw
}

/** 列表 Tab 用：待执行 / 进行中 / 已完成 */
export function driverV1ListStatusLabel(status) {
  const n = normalizeDriverOrderStatus(status)
  if (n === 'started') return '进行中'
  if (n === 'completed') return '已完成'
  if (n === 'cancelled') return '已取消'
  return '待执行'
}
