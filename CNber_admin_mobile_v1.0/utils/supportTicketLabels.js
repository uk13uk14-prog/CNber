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

export function ticketTypeLabel(v) {
  return TICKET_TYPE_OPTIONS.find((x) => x.value === v)?.label || v || '—'
}

export function ticketStatusLabel(v) {
  return TICKET_STATUS_OPTIONS.find((x) => x.value === v)?.label || v || '—'
}

export function ticketPriorityLabel(v) {
  return TICKET_PRIORITY_OPTIONS.find((x) => x.value === v)?.label || v || '—'
}
