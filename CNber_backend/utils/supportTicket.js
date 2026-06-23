const SupportTicket = require('../models/SupportTicket')

const TYPE_LABELS = {
  modify_order: '修改订单',
  cancel_order: '取消订单',
  refund_request: '退款申请',
  complaint: '投诉',
  lost_item: '遗失物品',
  driver_issue: '司机问题',
  order_issue: '订单问题',
  passenger_no_show: '乘客未出现',
  payment_issue: '结算/打款问题',
  vehicle_issue: '车辆问题',
  other: '其他'
}

const STATUS_LABELS = {
  pending: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
  closed: '已关闭'
}

const PRIORITY_LABELS = {
  low: '低',
  normal: '普通',
  high: '高',
  urgent: '紧急'
}

const REQUESTER_ROLE_LABELS = {
  customer: '客户',
  driver: '司机',
  admin: '后台'
}

function formatDateKey(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

async function nextTicketNo() {
  const dateKey = formatDateKey(new Date())
  const prefix = `ST-${dateKey}-`
  const last = await SupportTicket.findOne({ ticketNo: new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })
    .sort({ ticketNo: -1 })
    .select('ticketNo')
    .lean()
  let seq = 1
  if (last?.ticketNo) {
    const m = String(last.ticketNo).match(/-(\d+)$/)
    if (m) seq = parseInt(m[1], 10) + 1
  }
  return `${prefix}${String(seq).padStart(3, '0')}`
}

function canStaffReadTicket(role, ticket) {
  if (role === 'admin' || role === 'support' || role === 'operator') return true
  if (role === 'finance') return ticket?.type === 'refund_request'
  return false
}

function canStaffWriteTicket(role, ticket) {
  if (role === 'admin' || role === 'support' || role === 'operator') {
    return canStaffReadTicket(role, ticket)
  }
  return false
}

function canStaffCreateTicket(role) {
  return ['admin', 'support', 'operator'].includes(role)
}

function financeListTypeFilter(role, queryType) {
  if (role !== 'finance') return queryType
  if (queryType && queryType !== 'refund_request') {
    return '__none__'
  }
  return 'refund_request'
}

function toTicketDto(doc) {
  const row = doc?.toObject ? doc.toObject() : { ...doc }
  return {
    ...row,
    typeLabel: TYPE_LABELS[row.type] || row.type,
    statusLabel: STATUS_LABELS[row.status] || row.status,
    priorityLabel: PRIORITY_LABELS[row.priority] || row.priority,
    requesterRoleLabel: REQUESTER_ROLE_LABELS[row.requesterRole] || row.requesterRole
  }
}

function appendLog(ticket, { content, action, authorId, authorName }) {
  const entry = {
    content: String(content || '').trim(),
    action: action || 'comment',
    authorId: authorId || null,
    authorName: authorName || '',
    createdAt: new Date()
  }
  if (!entry.content) return null
  ticket.operationLogs = ticket.operationLogs || []
  ticket.operationLogs.push(entry)
  return entry
}

module.exports = {
  TYPE_LABELS,
  STATUS_LABELS,
  PRIORITY_LABELS,
  REQUESTER_ROLE_LABELS,
  nextTicketNo,
  canStaffReadTicket,
  canStaffWriteTicket,
  canStaffCreateTicket,
  financeListTypeFilter,
  toTicketDto,
  appendLog
}
