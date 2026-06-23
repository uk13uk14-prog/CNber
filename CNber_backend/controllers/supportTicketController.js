const mongoose = require('mongoose')
const SupportTicket = require('../models/SupportTicket')
const Order = require('../models/Order')
const User = require('../models/User')
const {
  TICKET_TYPES,
  DRIVER_TICKET_TYPES,
  TICKET_STATUSES,
  PRIORITIES,
  REQUESTER_ROLES
} = require('../models/SupportTicket')
const {
  nextTicketNo,
  canStaffReadTicket,
  canStaffWriteTicket,
  canStaffCreateTicket,
  financeListTypeFilter,
  toTicketDto,
  appendLog
} = require('../utils/supportTicket')
const { auditLog } = require('../utils/auditLog')

function userIdOf(req) {
  return req.user?.userId || req.user?._id || null
}

function staffRole(req) {
  return req.user?.role || ''
}

function staffDisplayName(req) {
  return req.user?.displayName || req.user?.phone || staffRole(req) || '员工'
}

async function resolveOrderLink(orderId) {
  if (!orderId) return { orderId: null, orderNo: '' }
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }
  const order = await Order.findById(orderId).select('orderNo orderDateKey dailySeq').lean()
  if (!order) {
    const e = new Error('关联订单不存在')
    e.code = 400
    throw e
  }
  let orderNo = order.orderNo || ''
  if (!orderNo && order.orderDateKey && order.dailySeq != null) {
    orderNo = `${order.orderDateKey}-${String(order.dailySeq).padStart(3, '0')}`
  }
  return { orderId: order._id, orderNo }
}

async function resolveRequester(body) {
  let requesterUserId = body.requesterUserId || null
  let requesterPhone = String(body.requesterPhone || '').trim()
  const requesterRole = REQUESTER_ROLES.includes(body.requesterRole)
    ? body.requesterRole
    : 'customer'

  if (requesterUserId) {
    if (!mongoose.Types.ObjectId.isValid(requesterUserId)) {
      const e = new Error('requesterUserId 无效')
      e.code = 400
      throw e
    }
    const user = await User.findById(requesterUserId).select('phone role').lean()
    if (user?.phone) requesterPhone = user.phone
  }

  return { requesterUserId, requesterPhone, requesterRole }
}

function parseAttachments(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean)
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return []
}

function pickCreateBody(body = {}, { requireDescription = false, allowedTypes = TICKET_TYPES } = {}) {
  const type = String(body.type || '').trim()
  if (!allowedTypes.includes(type)) {
    const e = new Error('工单类型无效')
    e.code = 400
    throw e
  }
  const title = String(body.title || '').trim()
  if (!title) {
    const e = new Error('标题必填')
    e.code = 400
    throw e
  }
  const priority = PRIORITIES.includes(body.priority) ? body.priority : 'normal'
  const description = String(body.description ?? '').trim()
  if (requireDescription && !description) {
    const e = new Error('问题描述必填')
    e.code = 400
    throw e
  }
  const attachments = parseAttachments(body.attachments)
  const resolution = String(body.resolution ?? '').trim()
  return { type, title, description, priority, attachments, resolution }
}

function assertCustomerRole(req) {
  if (req.user?.role !== 'user') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }
}

function assertEndUserRole(req) {
  const role = req.user?.role
  if (role !== 'user' && role !== 'driver') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }
}

function requesterRoleFromReq(req) {
  return req.user?.role === 'driver' ? 'driver' : 'customer'
}

function requesterDisplayName(req) {
  if (req.user?.role === 'driver') {
    return req.user?.displayName || req.user?.phone || '司机'
  }
  return req.user?.phone || '客户'
}

function formatOrderNo(order) {
  if (!order) return ''
  if (order.orderNo) return String(order.orderNo)
  if (order.orderDateKey && order.dailySeq != null) {
    return `${order.orderDateKey}-${String(order.dailySeq).padStart(3, '0')}`
  }
  return ''
}

async function resolveCustomerOrderLink(req, body = {}) {
  const orderId = body.orderId || null
  const orderNo = String(body.orderNo || '').trim()
  if (!orderId && !orderNo) return { orderId: null, orderNo: '' }

  const userId = userIdOf(req)
  let order = null

  if (orderId) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      const e = new Error('订单 ID 无效')
      e.code = 400
      throw e
    }
    order = await Order.findById(orderId)
      .select('orderNo orderDateKey dailySeq userId')
      .lean()
  } else {
    order = await Order.findOne({ orderNo })
      .select('orderNo orderDateKey dailySeq userId')
      .lean()
  }

  if (!order) {
    const e = new Error('关联订单不存在')
    e.code = 400
    throw e
  }
  if (String(order.userId) !== String(userId)) {
    const e = new Error('无权关联该订单')
    e.code = 403
    throw e
  }

  return { orderId: order._id, orderNo: formatOrderNo(order) }
}

async function resolveDriverOrderLink(req, body = {}) {
  const orderId = body.orderId || null
  const orderNo = String(body.orderNo || '').trim()
  if (!orderId && !orderNo) return { orderId: null, orderNo: '' }

  const driverId = userIdOf(req)
  let order = null

  if (orderId) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      const e = new Error('订单 ID 无效')
      e.code = 400
      throw e
    }
    order = await Order.findById(orderId)
      .select('orderNo orderDateKey dailySeq driverId assignedDriver')
      .lean()
  } else {
    order = await Order.findOne({ orderNo })
      .select('orderNo orderDateKey dailySeq driverId assignedDriver')
      .lean()
  }

  if (!order) {
    const e = new Error('关联订单不存在')
    e.code = 400
    throw e
  }

  const linkedDriverId = String(order.assignedDriver || order.driverId || '')
  if (linkedDriverId !== String(driverId)) {
    const e = new Error('无权关联该订单')
    e.code = 403
    throw e
  }

  return { orderId: order._id, orderNo: formatOrderNo(order) }
}

function assertOwnTicket(req, ticket) {
  const uid = String(userIdOf(req))
  const role = requesterRoleFromReq(req)
  if (String(ticket.requesterUserId) !== uid || ticket.requesterRole !== role) {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }
}

function buildListQuery(req) {
  const role = staffRole(req)
  const q = {}
  const keyword = String(req.query.keyword || '').trim()
  if (keyword) {
    const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    q.$or = [{ ticketNo: re }, { orderNo: re }, { requesterPhone: re }, { title: re }]
  }

  const status = String(req.query.status || '').trim()
  if (status && TICKET_STATUSES.includes(status)) q.status = status

  let type = String(req.query.type || '').trim()
  type = financeListTypeFilter(role, type)
  if (type === '__none__') {
    q.ticketNo = '__NO_MATCH__'
  } else if (type && TICKET_TYPES.includes(type)) {
    q.type = type
  } else if (role === 'finance') {
    q.type = 'refund_request'
  }

  const priority = String(req.query.priority || '').trim()
  if (priority && PRIORITIES.includes(priority)) q.priority = priority

  return q
}

function assertRead(req, ticket) {
  if (!canStaffReadTicket(staffRole(req), ticket)) {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }
}

function assertWrite(req, ticket) {
  assertRead(req, ticket)
  if (!canStaffWriteTicket(staffRole(req), ticket)) {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }
}

/** GET /api/admin/support-tickets */
exports.listSupportTickets = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const query = buildListQuery(req)

  const [items, total] = await Promise.all([
    SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    SupportTicket.countDocuments(query)
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      tickets: items.map(toTicketDto),
      total,
      page,
      pageSize
    }
  })
}

/** GET /api/admin/support-tickets/:id */
exports.getSupportTicket = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const doc = await SupportTicket.findById(id).lean()
  if (!doc) {
    const e = new Error('工单不存在')
    e.code = 404
    throw e
  }
  assertRead(req, doc)
  res.json({
    code: 0,
    message: 'success',
    data: { ticket: toTicketDto(doc) }
  })
}

/** POST /api/admin/support-tickets */
exports.createSupportTicket = async (req, res) => {
  if (!canStaffCreateTicket(staffRole(req))) {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const fields = pickCreateBody(req.body)
  const orderLink = await resolveOrderLink(req.body?.orderId)
  const requester = await resolveRequester(req.body || {})
  const ticketNo = await nextTicketNo()

  let assignedStaffId = req.body?.assignedStaffId || userIdOf(req)
  let assignedStaffName = String(req.body?.assignedStaffName || '').trim() || staffDisplayName(req)
  if (assignedStaffId && mongoose.Types.ObjectId.isValid(assignedStaffId)) {
    const staff = await User.findById(assignedStaffId).select('phone adminProfile').lean()
    if (staff) {
      assignedStaffName =
        staff.adminProfile?.displayName || assignedStaffName || staff.phone || assignedStaffName
    }
  } else {
    assignedStaffId = userIdOf(req)
  }

  const doc = await SupportTicket.create({
    ticketNo,
    ...orderLink,
    ...requester,
    ...fields,
    status: 'pending',
    assignedStaffId,
    assignedStaffName,
    createdBy: userIdOf(req),
    updatedBy: userIdOf(req),
    operationLogs: [
      {
        content: '工单已创建',
        action: 'create',
        authorId: userIdOf(req),
        authorName: staffDisplayName(req),
        createdAt: new Date()
      }
    ]
  })

  void auditLog(req, {
    action: '创建工单',
    module: 'support_tickets',
    entityId: String(doc._id),
    entityType: 'support_ticket',
    description: `工单 ${ticketNo} 已创建`
  })

  res.status(201).json({
    code: 0,
    message: 'success',
    data: { ticket: toTicketDto(doc.toObject()) }
  })
}

/** PATCH /api/admin/support-tickets/:id */
exports.patchSupportTicket = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const ticket = await SupportTicket.findById(id)
  if (!ticket) {
    const e = new Error('工单不存在')
    e.code = 404
    throw e
  }
  assertWrite(req, ticket)

  const body = req.body || {}
  const patch = { updatedBy: userIdOf(req) }

  if (body.type && TICKET_TYPES.includes(body.type)) patch.type = body.type
  if (body.priority && PRIORITIES.includes(body.priority)) patch.priority = body.priority
  if (body.title != null) {
    const title = String(body.title).trim()
    if (!title) {
      const e = new Error('标题不能为空')
      e.code = 400
      throw e
    }
    patch.title = title
  }
  if (body.description != null) patch.description = String(body.description).trim()
  if (body.resolution != null) patch.resolution = String(body.resolution).trim()
  if (body.attachments != null) patch.attachments = parseAttachments(body.attachments)

  if (body.orderId !== undefined) {
    if (!body.orderId) {
      patch.orderId = null
      patch.orderNo = ''
    } else {
      Object.assign(patch, await resolveOrderLink(body.orderId))
    }
  }

  if (body.requesterPhone != null) patch.requesterPhone = String(body.requesterPhone).trim()
  if (body.requesterRole && REQUESTER_ROLES.includes(body.requesterRole)) {
    patch.requesterRole = body.requesterRole
  }

  if (body.assignedStaffId !== undefined) {
    if (!body.assignedStaffId) {
      patch.assignedStaffId = null
      patch.assignedStaffName = ''
    } else if (mongoose.Types.ObjectId.isValid(body.assignedStaffId)) {
      patch.assignedStaffId = body.assignedStaffId
      const staff = await User.findById(body.assignedStaffId).select('phone adminProfile').lean()
      patch.assignedStaffName =
        body.assignedStaffName ||
        staff?.adminProfile?.displayName ||
        staff?.phone ||
        String(body.assignedStaffName || '').trim()
    }
  } else if (body.assignedStaffName != null) {
    patch.assignedStaffName = String(body.assignedStaffName).trim()
  }

  Object.assign(ticket, patch)
  await ticket.save()

  res.json({
    code: 0,
    message: 'success',
    data: { ticket: toTicketDto(ticket.toObject()) }
  })
}

/** PATCH /api/admin/support-tickets/:id/status */
exports.patchSupportTicketStatus = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const status = String(req.body?.status || '').trim()
  if (!TICKET_STATUSES.includes(status)) {
    const e = new Error('状态无效')
    e.code = 400
    throw e
  }

  const ticket = await SupportTicket.findById(id)
  if (!ticket) {
    const e = new Error('工单不存在')
    e.code = 404
    throw e
  }
  assertWrite(req, ticket)

  const prev = ticket.status
  ticket.status = status
  ticket.updatedBy = userIdOf(req)
  if (status === 'closed' || status === 'resolved') {
    ticket.closedAt = new Date()
  } else {
    ticket.closedAt = null
  }
  if (req.body?.resolution) {
    ticket.resolution = String(req.body.resolution).trim()
  }

  appendLog(ticket, {
    content: `状态 ${prev} → ${status}${ticket.resolution ? `；处理结果：${ticket.resolution}` : ''}`,
    action: 'status',
    authorId: userIdOf(req),
    authorName: staffDisplayName(req)
  })

  await ticket.save()

  void auditLog(req, {
    action: status === 'closed' || status === 'resolved' ? '关闭工单' : '更新工单状态',
    module: 'support_tickets',
    entityId: String(ticket._id),
    entityType: 'support_ticket',
    description: `工单 ${ticket.ticketNo || ticket._id} 状态 ${prev} → ${status}`
  })

  res.json({
    code: 0,
    message: 'success',
    data: { ticket: toTicketDto(ticket.toObject()) }
  })
}

/** POST /api/support-tickets — 客户/司机提交工单 */
exports.createEndUserSupportTicket = async (req, res) => {
  assertEndUserRole(req)
  const isDriver = req.user?.role === 'driver'
  const requesterRole = isDriver ? 'driver' : 'customer'
  const allowedTypes = isDriver ? DRIVER_TICKET_TYPES : TICKET_TYPES

  const fields = pickCreateBody(req.body, {
    requireDescription: true,
    allowedTypes
  })
  const orderLink = isDriver
    ? await resolveDriverOrderLink(req, req.body || {})
    : await resolveCustomerOrderLink(req, req.body || {})
  const ticketNo = await nextTicketNo()
  const uid = userIdOf(req)

  const doc = await SupportTicket.create({
    ticketNo,
    ...orderLink,
    requesterUserId: uid,
    requesterPhone: String(req.user?.phone || '').trim(),
    requesterRole,
    ...fields,
    status: 'pending',
    createdBy: uid,
    updatedBy: uid,
    operationLogs: [
      {
        content: isDriver ? '司机提交工单' : '客户提交工单',
        action: 'create',
        authorId: uid,
        authorName: requesterDisplayName(req),
        createdAt: new Date()
      }
    ]
  })

  res.status(201).json({
    code: 0,
    message: 'success',
    data: { ticket: toTicketDto(doc.toObject()) }
  })
}

/** @deprecated 兼容旧引用 */
exports.createCustomerSupportTicket = exports.createEndUserSupportTicket

/** GET /api/support-tickets/my — 客户/司机本人工单列表 */
exports.listMySupportTickets = async (req, res) => {
  assertEndUserRole(req)

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const uid = userIdOf(req)
  const requesterRole = requesterRoleFromReq(req)

  const query = { requesterUserId: uid, requesterRole }
  const status = String(req.query.status || '').trim()
  if (status && TICKET_STATUSES.includes(status)) query.status = status

  const [items, total] = await Promise.all([
    SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    SupportTicket.countDocuments(query)
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      tickets: items.map(toTicketDto),
      total,
      page,
      pageSize
    }
  })
}

/** GET /api/support-tickets/:id — 客户/司机本人工单详情 */
exports.getMySupportTicket = async (req, res) => {
  assertEndUserRole(req)
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const doc = await SupportTicket.findById(id).lean()
  if (!doc) {
    const e = new Error('工单不存在')
    e.code = 404
    throw e
  }
  assertOwnTicket(req, doc)
  res.json({
    code: 0,
    message: 'success',
    data: { ticket: toTicketDto(doc) }
  })
}

/** POST /api/admin/support-tickets/:id/comment */
exports.addSupportTicketComment = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const content = String(req.body?.content || req.body?.comment || '').trim()
  if (!content) {
    const e = new Error('处理记录内容必填')
    e.code = 400
    throw e
  }

  const ticket = await SupportTicket.findById(id)
  if (!ticket) {
    const e = new Error('工单不存在')
    e.code = 404
    throw e
  }
  assertWrite(req, ticket)

  appendLog(ticket, {
    content,
    action: 'comment',
    authorId: userIdOf(req),
    authorName: staffDisplayName(req)
  })

  if (ticket.status === 'pending') {
    ticket.status = 'in_progress'
  }
  ticket.updatedBy = userIdOf(req)
  await ticket.save()

  res.json({
    code: 0,
    message: 'success',
    data: { ticket: toTicketDto(ticket.toObject()) }
  })
}
