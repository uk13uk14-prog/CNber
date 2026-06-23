const mongoose = require('mongoose')
const Order = require('../models/Order')
const ORDER_STATUS = Order.ORDER_STATUS
const EXCEPTION_TYPES = Order.EXCEPTION_TYPES
const { attachPaymentToOrder } = require('../utils/orderPaymentSync')
const { logPushPayload } = require('../utils/operationLog')
const { paymentSummary, roundMoney, buildQuotePatch } = require('../utils/pricing')
const { quotedManualPaymentAmounts } = require('../utils/orderPaymentFlow')
const { buildOrderFinanceSnapshot } = require('../utils/orderFinanceSnapshot')
const { buildPaymentReviewItems } = require('../utils/enrichOrderPayments')
const {
  fireProfileSync,
  syncProfilesAfterOrderCompleted,
  syncProfilesAfterOrderCancelled
} = require('../utils/profileSync')

function assertValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(String(id || ''))) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }
}

function staffObjectId(req) {
  const uid = req.user && req.user.userId
  if (uid && mongoose.Types.ObjectId.isValid(String(uid))) return uid
  return null
}

function authorMeta(req) {
  const authorId = staffObjectId(req)
  const authorDisplay = String((req.user && req.user.phone) || req.user?.userId || '')
  return { authorId, authorDisplay }
}

function communicationEntry(req, content) {
  const { authorId, authorDisplay } = authorMeta(req)
  return {
    content: String(content).trim(),
    createdAt: new Date(),
    authorId,
    authorDisplay
  }
}

function markHandled(set, req) {
  const sid = staffObjectId(req)
  if (sid) set.handledBy = sid
  set.handledAt = new Date()
}

async function loadOrder(id) {
  const order = await Order.findById(id)
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')
    .populate('assignedStaff', 'phone')
    .populate('handledBy', 'phone')
  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  return order
}

function serializeOrder(order) {
  const raw = order.toObject ? order.toObject() : order
  const finance = buildOrderFinanceSnapshot(raw)
  return { order: attachPaymentToOrder(raw), finance }
}

/** GET /admin/payment-reviews */
exports.listPaymentReviews = async (req, res) => {
  const stage = String(req.query.stage || 'pending').trim()
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 20)))

  let query = {}
  if (stage === 'deposit') {
    query = { depositStatus: 'submitted' }
  } else if (stage === 'balance') {
    query = { balanceStatus: 'submitted' }
  } else if (stage === 'refund') {
    query = { exceptionType: { $in: ['refund_pending', 'refunded'] } }
  } else {
    query = {
      $or: [{ depositStatus: 'submitted' }, { balanceStatus: 'submitted' }]
    }
  }

  const orders = await Order.find(query)
    .sort({ updatedAt: -1 })
    .populate('userId', 'phone')
    .lean()

  const allItems = await buildPaymentReviewItems(orders, stage)
  const total = allItems.length
  const items = allItems.slice((page - 1) * pageSize, page * pageSize)

  res.json({
    code: 0,
    message: 'success',
    data: { items, total, page, pageSize }
  })
}

/** GET /admin/orders/:id/finance */
exports.getOrderFinance = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const order = await Order.findById(id).lean()
  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  res.json({
    code: 0,
    message: 'success',
    data: { finance: buildOrderFinanceSnapshot(order) }
  })
}

/** GET /admin/finance/reconciliation */
exports.listReconciliation = async (req, res) => {
  const settlementStatus = String(req.query.settlementStatus || '').trim()
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)))

  const query = {
    $or: [
      { depositStatus: { $in: ['submitted', 'confirmed', 'refunded'] } },
      { balanceStatus: { $in: ['submitted', 'confirmed', 'refunded'] } },
      { depositPaid: true },
      { remainingPaid: true },
      { status: ORDER_STATUS.COMPLETED }
    ]
  }
  if (settlementStatus) query.settlementStatus = settlementStatus

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('userId', 'phone')
      .populate('driverId', 'phone')
      .lean(),
    Order.countDocuments(query)
  ])

  const rows = orders.map((o) => ({
    orderId: o._id,
    orderNo: o.orderNo,
    status: o.status,
    customerPhone: o.userId?.phone || '',
    driverPhone: o.driverId?.phone || o.assignedDriverPhone || '',
    ...buildOrderFinanceSnapshot(o)
  }))

  res.json({
    code: 0,
    message: 'success',
    data: { rows, total, page, pageSize }
  })
}

/** POST /admin/orders/:id/cancel */
exports.adminCancelOrder = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const body = req.body || {}
  const by = body.by === 'customer' ? 'cancelled_by_customer' : 'cancelled_by_admin'
  const reason = String(body.reason || body.exceptionReason || '').trim()
  const notes = String(body.exceptionNotes || body.notes || '').trim()

  const set = {
    status: ORDER_STATUS.CANCELLED,
    dispatchStatus: Order.DISPATCH_STATUS.CANCELLED,
    exceptionType: by,
    exceptionReason: reason,
    serviceStatus: 'closed',
    updatedAt: new Date()
  }
  if (notes) set.exceptionNotes = notes
  markHandled(set, req)

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: set,
      $push: logPushPayload(req, 'admin_cancel', `人工取消：${by}${reason ? ` · ${reason}` : ''}`)
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  fireProfileSync(syncProfilesAfterOrderCancelled, order, 'adminCancelOrder')

  res.json({ code: 0, message: 'success', data: serializeOrder(order) })
}

/** POST /admin/orders/:id/change-price */
exports.adminChangePrice = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const amount = Number(req.body?.amount)
  const reason = String(req.body?.reason || '').trim()
  if (!Number.isFinite(amount) || amount <= 0) {
    const e = new Error('金额须为正数')
    e.code = 400
    throw e
  }

  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  const total = roundMoney(amount)
  const split = paymentSummary({ ...current.toObject(), amount: total })
  const set = {
    amount: total,
    totalAmount: total,
    ...buildQuotePatch(total, { quoteSource: 'manual' }),
    ...quotedManualPaymentAmounts(total),
    exceptionType: 'price_changed',
    exceptionReason: reason,
    serviceStatus: 'exception',
    updatedAt: new Date()
  }
  markHandled(set, req)

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: set,
      $push: logPushPayload(req, 'change_price', `人工改价 £${total}${reason ? ` · ${reason}` : ''}`)
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({ code: 0, message: 'success', data: serializeOrder(order) })
}

/** POST /admin/orders/:id/refund */
exports.adminRefund = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const target = String(req.body?.target || 'deposit').trim()
  const reason = String(req.body?.reason || '').trim()
  const confirm = Boolean(req.body?.confirm)

  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  const set = {
    serviceStatus: 'exception',
    updatedAt: new Date()
  }
  markHandled(set, req)

  if (!confirm) {
    set.exceptionType = 'refund_pending'
    set.exceptionReason = reason
  } else {
    set.exceptionType = 'refunded'
    set.exceptionReason = reason
    const fin = buildOrderFinanceSnapshot(current.toObject())
    set.refundAmount = fin.refundAmount || fin.customerPaidTotal
    if (target === 'balance' || target === 'full') {
      set.balanceStatus = 'refunded'
      set.remainingPaid = false
    }
    if (target === 'deposit' || target === 'full') {
      set.depositStatus = 'refunded'
      set.depositPaid = false
    }
    set.settlementStatus = 'partially_settled'
  }

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: set,
      $push: logPushPayload(
        req,
        confirm ? 'refund_confirmed' : 'refund_pending',
        confirm ? `已确认退款（${target}）` : `标记待退款（${target}）`
      )
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({ code: 0, message: 'success', data: serializeOrder(order) })
}

/** POST /admin/orders/:id/dispute */
exports.adminDispute = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const action = String(req.body?.action || 'open').trim()
  const note = String(req.body?.note || req.body?.reason || '').trim()

  const set = {
    updatedAt: new Date()
  }
  markHandled(set, req)

  if (action === 'close') {
    set.exceptionType = 'dispute_closed'
    set.serviceStatus = 'active'
  } else {
    set.exceptionType = 'dispute_open'
    set.serviceStatus = 'dispute'
  }
  if (note) set.exceptionNotes = note

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: set,
      $push: logPushPayload(req, `dispute_${action}`, note || `争议${action === 'close' ? '关闭' : '开启'}`)
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  res.json({ code: 0, message: 'success', data: serializeOrder(order) })
}

/** POST /admin/orders/:id/exception */
exports.adminSetException = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const { exceptionType, exceptionReason, exceptionNotes } = req.body || {}
  if (!exceptionType || !EXCEPTION_TYPES.includes(exceptionType)) {
    const e = new Error('无效的 exceptionType')
    e.code = 400
    throw e
  }

  const set = {
    exceptionType,
    exceptionReason: String(exceptionReason || '').trim(),
    exceptionNotes: String(exceptionNotes || '').trim(),
    serviceStatus: ['dispute_open', 'dispute_closed'].includes(exceptionType) ? 'dispute' : 'exception',
    updatedAt: new Date()
  }
  markHandled(set, req)

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: set,
      $push: logPushPayload(req, 'set_exception', `异常：${exceptionType}`)
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  res.json({ code: 0, message: 'success', data: serializeOrder(order) })
}

/** PATCH /admin/orders/:id/sop */
exports.updateSop = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const body = req.body || {}
  const set = { updatedAt: new Date() }

  if (body.nextAction !== undefined) set.nextAction = String(body.nextAction).trim()
  if (body.nextActionAt !== undefined) {
    set.nextActionAt = body.nextActionAt ? new Date(body.nextActionAt) : null
  }
  if (body.serviceStatus !== undefined) set.serviceStatus = body.serviceStatus
  if (body.assignedStaff !== undefined) {
    if (body.assignedStaff && mongoose.Types.ObjectId.isValid(String(body.assignedStaff))) {
      set.assignedStaff = body.assignedStaff
    } else {
      set.assignedStaff = null
    }
  }

  const order = await Order.findByIdAndUpdate(id, { $set: set }, { new: true })
    .populate('userId', 'phone role')
    .populate('assignedStaff', 'phone')

  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  res.json({ code: 0, message: 'success', data: serializeOrder(order) })
}

function pushLogField(field) {
  return async (req, res) => {
    const { id } = req.params
    assertValidId(id)
    const content = String((req.body && req.body.content) || '').trim()
    if (!content) {
      const e = new Error('内容不能为空')
      e.code = 400
      throw e
    }

    const order = await Order.findByIdAndUpdate(
      id,
      {
        $push: { [field]: communicationEntry(req, content) },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    )
      .populate('userId', 'phone role')
      .populate('assignedStaff', 'phone')

    if (!order) {
      const e = new Error('订单不存在')
      e.code = 404
      throw e
    }

    res.json({ code: 0, message: 'success', data: serializeOrder(order) })
  }
}

exports.addInternalNote = pushLogField('internalNotes')
exports.addCustomerLog = pushLogField('customerCommunicationLogs')
exports.addDriverLog = pushLogField('driverCommunicationLogs')

/** POST /admin/orders/:id/close — 试运营结案 */
exports.closeOrder = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const note = String(req.body?.note || '').trim()

  const fin = buildOrderFinanceSnapshot((await Order.findById(id).lean()) || {})
  const set = {
    status: ORDER_STATUS.COMPLETED,
    serviceStatus: 'closed',
    settlementStatus:
      fin.unsettledAmount > 0 ? 'partially_settled' : 'settled',
    updatedAt: new Date()
  }
  markHandled(set, req)

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: set,
      $push: logPushPayload(req, 'close_order', note || '运营结案关闭')
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  fireProfileSync(syncProfilesAfterOrderCompleted, order, 'closeOrder')

  res.json({ code: 0, message: 'success', data: serializeOrder(order) })
}
