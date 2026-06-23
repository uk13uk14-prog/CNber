import { request } from './request.js'

export function createSupportTicket(payload) {
  return request({
    url: '/support-tickets',
    method: 'POST',
    data: payload
  })
}

export function fetchMySupportTickets(params = {}) {
  return request({
    url: '/support-tickets/my',
    method: 'GET',
    data: params
  })
}

export function fetchMySupportTicketDetail(id) {
  return request({
    url: `/support-tickets/${id}`,
    method: 'GET'
  })
}

export const DRIVER_TICKET_TYPES = [
  { value: 'order_issue', label: '订单问题' },
  { value: 'passenger_no_show', label: '乘客未出现' },
  { value: 'payment_issue', label: '结算/打款问题' },
  { value: 'vehicle_issue', label: '车辆问题' },
  { value: 'complaint', label: '投诉' },
  { value: 'other', label: '其他' }
]

export const SUPPORT_TICKET_PRIORITIES = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
]

export const SUPPORT_TICKET_STATUSES = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' }
]

export function supportTicketTypeLabel(type) {
  const row = DRIVER_TICKET_TYPES.find((x) => x.value === type)
  return row?.label || type || '—'
}

export function supportTicketStatusLabel(status) {
  const row = SUPPORT_TICKET_STATUSES.find((x) => x.value === status)
  return row?.label || status || '—'
}

export function supportTicketPriorityLabel(priority) {
  const row = SUPPORT_TICKET_PRIORITIES.find((x) => x.value === priority)
  return row?.label || priority || '—'
}

export const PAYMENT_METHOD_LABELS = {
  bank_transfer: '银行转账',
  wise: 'Wise',
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
  other: '其他'
}

export function paymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || '—'
}
