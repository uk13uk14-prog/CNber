import { request } from './request.js'

/**
 * 客户提交客服工单
 * @param {{ type: string, title: string, description: string, priority?: string, orderId?: string, orderNo?: string }} payload
 */
export function createSupportTicket(payload) {
  return request({
    url: '/support-tickets',
    method: 'POST',
    data: payload
  })
}

/** 当前客户提交的工单列表 */
export function fetchMySupportTickets(params = {}) {
  return request({
    url: '/support-tickets/my',
    method: 'GET',
    data: params
  })
}

/** 工单详情（本人） */
export function fetchMySupportTicketDetail(id) {
  return request({
    url: `/support-tickets/${id}`,
    method: 'GET'
  })
}

export const SUPPORT_TICKET_STATUSES = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' }
]

export const SUPPORT_TICKET_TYPES = [
  { value: 'other', label: '联系客服' },
  { value: 'complaint', label: '投诉' },
  { value: 'lost_item', label: '遗失物品' },
  { value: 'modify_order', label: '修改订单' },
  { value: 'cancel_order', label: '取消订单' },
  { value: 'refund_request', label: '退款申请' },
  { value: 'driver_issue', label: '司机问题' }
]

export const SUPPORT_TICKET_PRIORITIES = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
]

export function supportTicketTypeLabel(type) {
  const row = SUPPORT_TICKET_TYPES.find((x) => x.value === type)
  return row?.label || type || '—'
}

export function supportTicketPriorityLabel(priority) {
  const row = SUPPORT_TICKET_PRIORITIES.find((x) => x.value === priority)
  return row?.label || priority || '—'
}

export function supportTicketStatusLabel(status) {
  const row = SUPPORT_TICKET_STATUSES.find((x) => x.value === status)
  return row?.label || status || '—'
}
