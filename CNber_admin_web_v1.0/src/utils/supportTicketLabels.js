export const TICKET_TYPE_OPTIONS = [
  { value: 'modify_order', label: '修改订单' },
  { value: 'cancel_order', label: '取消订单' },
  { value: 'refund_request', label: '退款申请' },
  { value: 'complaint', label: '投诉' },
  { value: 'lost_item', label: '遗失物品' },
  { value: 'driver_issue', label: '司机问题' },
  { value: 'other', label: '其他' }
]

export const TICKET_STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' }
]

export const TICKET_PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
]

export const REQUESTER_ROLE_OPTIONS = [
  { value: 'customer', label: '客户' },
  { value: 'driver', label: '司机' },
  { value: 'admin', label: '后台' }
]

export function ticketTypeLabel(v) {
  return TICKET_TYPE_OPTIONS.find((x) => x.value === v)?.label || v || '—'
}

export function ticketStatusLabel(v) {
  return TICKET_STATUS_OPTIONS.find((x) => x.value === v)?.label || v || '—'
}

export function ticketPriorityLabel(v) {
  return TICKET_PRIORITY_OPTIONS.find((x) => x.value === v)?.label || v || '—'
}

export function ticketStatusClass(v) {
  if (v === 'resolved' || v === 'closed') return 'pill-ok'
  if (v === 'in_progress') return 'pill-progress'
  if (v === 'pending') return 'pill-pending'
  return ''
}

export function ticketPriorityClass(v) {
  if (v === 'urgent') return 'pill-urgent'
  if (v === 'high') return 'pill-high'
  return ''
}

export function canHandleTickets(role) {
  return ['admin', 'support', 'operator'].includes(role)
}
