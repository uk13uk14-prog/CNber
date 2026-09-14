const mongoose = require('mongoose')
const Order = require('../models/Order')
const DriverCancellationRequest = require('../models/DriverCancellationRequest')
const ORDER_STATUS = Order.ORDER_STATUS
const REQUEST_STATUS = DriverCancellationRequest.REQUEST_STATUS
const { presentOrderForApi } = require('../utils/orderPresentation')
const { logPushPayload } = require('../utils/operationLog')
const {
  parseOrderPickupAt,
  hoursUntilPickup,
  requiresCustomerApprovalForDriverCancel
} = require('../utils/scheduledPickup')
const {
  DRIVER_CANCEL_ALLOWED_STATUSES,
  phoneOf,
  idOf,
  normalizeCancelReason,
  applyUnassignToNeedsRedispatch
} = require('../utils/driverCancelFlow')
const { createAdminNotification } = require('../utils/adminNotifications')

function assertValidObjectId(id, message = '订单 ID 无效') {
  if (!mongoose.Types.ObjectId.isValid(String(id || ''))) {
    const e = new Error(message)
    e.code = 400
    throw e
  }
}

function presentRequest(doc) {
  if (!doc) return null
  const row = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return {
    id: String(row._id),
    orderId: row.orderId ? String(row.orderId) : '',
    orderNo: row.orderNo || '',
    driverId: row.driverId ? String(row.driverId) : '',
    driverPhone: row.driverPhone || '',
    customerId: row.customerId ? String(row.customerId) : '',
    customerPhone: row.customerPhone || '',
    reason: row.reason || '',
    note: row.note || '',
    requestedAt: row.requestedAt,
    hoursBeforePickup: row.hoursBeforePickup,
    requiresCustomerApproval: !!row.requiresCustomerApproval,
    status: row.status,
    decidedAt: row.decidedAt,
    driverAckedAt: row.driverAckedAt,
    pickup: row.pickup || '',
    destination: row.destination || '',
    pickupAt: row.pickupAt
  }
}

function attachCancelMeta(order) {
  if (!order) return order
  const pickupAt = parseOrderPickupAt(order)
  const hours = hoursUntilPickup(order)
  order.hoursUntilPickup = hours
  order.requiresCustomerApproval = requiresCustomerApprovalForDriverCancel(order)
  order.pickupAt = pickupAt ? pickupAt.toISOString() : null
  return order
}

async function loadAssignedOrderForDriver(orderId, driverUserId) {
  const order = await Order.findOne({
    _id: orderId,
    driverId: driverUserId
  })
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  if (!order) {
    const e = new Error('订单不存在或无权操作')
    e.code = 400
    throw e
  }
  if (!DRIVER_CANCEL_ALLOWED_STATUSES.includes(order.status)) {
    const e = new Error('当前状态不可取消派单，行程已开始请联系客服')
    e.code = 400
    throw e
  }
  return order
}

exports.attachCancelMeta = attachCancelMeta
exports.presentRequest = presentRequest

/**
 * 司机取消派单：>=24h 直接退回待重新派单；<24h 只建申请，不改订单。
 * 禁止把客户订单标成 cancelled。
 */
exports.cancelOrder = async (req, res) => {
  if (req.user.role !== 'driver') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const { orderId, reason, note } = req.body || {}
  if (!orderId) {
    const e = new Error('缺少 orderId')
    e.code = 400
    throw e
  }
  assertValidObjectId(orderId)
  const { reason: cancelReason, note: cancelNote } = normalizeCancelReason(reason, note)

  const order = await loadAssignedOrderForDriver(orderId, req.user.userId)
  const needsApproval = requiresCustomerApprovalForDriverCancel(order)
  const hours = hoursUntilPickup(order)
  const pickupAt = parseOrderPickupAt(order)
  const customerId = order.userId && (order.userId._id || order.userId)
  const driverPhone = req.user.phone || phoneOf(order.driverId) || order.assignedDriverPhone || ''
  const customerPhone = phoneOf(order.userId)

  if (needsApproval) {
    const existing = await DriverCancellationRequest.findOne({
      orderId: order._id,
      driverId: req.user.userId,
      status: REQUEST_STATUS.PENDING
    })
    if (existing) {
      return res.json({
        code: 0,
        message: '距离出发不足24小时，取消需要乘客批准',
        data: {
          requiresCustomerApproval: true,
          request: presentRequest(existing),
          order: attachCancelMeta(await presentOrderForApi(order)),
          message: '取消申请已发送，等待乘客确认。在客户批准前，请继续保留该订单。'
        }
      })
    }

    const requestDoc = await DriverCancellationRequest.create({
      orderId: order._id,
      orderNo: order.orderNo || '',
      driverId: req.user.userId,
      driverPhone,
      customerId,
      customerPhone,
      reason: cancelReason,
      note: cancelNote,
      requestedAt: new Date(),
      hoursBeforePickup: hours,
      requiresCustomerApproval: true,
      status: REQUEST_STATUS.PENDING,
      pickup: order.pickup || '',
      destination: order.destination || '',
      pickupAt
    })

    await Order.findByIdAndUpdate(order._id, {
      $push: logPushPayload(
        req,
        'driver_cancel_request',
        `司机申请取消：${cancelReason}${cancelNote ? ` · ${cancelNote}` : ''}（不足24小时，待乘客批准）`
      ),
      $set: { updatedAt: new Date() }
    })

    const fresh = await Order.findById(order._id)
      .populate('userId', 'phone role')
      .populate('driverId', 'phone role')

    return res.json({
      code: 0,
      message: '距离出发不足24小时，取消需要乘客批准',
      data: {
        requiresCustomerApproval: true,
        request: presentRequest(requestDoc),
        order: attachCancelMeta(await presentOrderForApi(fresh)),
        message: '取消申请已发送，等待乘客确认。在客户批准前，请继续保留该订单。'
      }
    })
  }

  const updated = await applyUnassignToNeedsRedispatch({
    order,
    req,
    reason: cancelReason,
    note: cancelNote,
    logAction: 'driver_cancel_assignment',
    logMessage: `司机取消派单：${cancelReason}${cancelNote ? ` · ${cancelNote}` : ''}（≥24小时，退回待重新派单）`,
    notificationType: 'REDISPATCH_REQUIRED',
    notificationTitle: '有订单需要重新派单'
  })

  if (!updated) {
    const e = new Error('取消失败，订单状态已变化')
    e.code = 400
    throw e
  }

  await DriverCancellationRequest.updateMany(
    { orderId: order._id, status: REQUEST_STATUS.PENDING },
    { $set: { status: REQUEST_STATUS.CANCELLED, decidedAt: new Date() } }
  )

  await DriverCancellationRequest.create({
    orderId: order._id,
    orderNo: order.orderNo || '',
    driverId: req.user.userId,
    driverPhone,
    customerId,
    customerPhone,
    reason: cancelReason,
    note: cancelNote,
    requestedAt: new Date(),
    hoursBeforePickup: hours,
    requiresCustomerApproval: false,
    status: REQUEST_STATUS.APPROVED,
    decidedAt: new Date(),
    decidedBy: req.user.userId,
    pickup: order.pickup || '',
    destination: order.destination || '',
    pickupAt
  })

  await createAdminNotification({
    type: 'DRIVER_CANCELLED',
    orderId: updated._id,
    orderNo: updated.orderNo || '',
    title: '司机已取消派单',
    body: `${updated.orderNo || ''} · ${driverPhone} · ${cancelReason}`,
    payload: {
      previousDriverPhone: driverPhone,
      reason: cancelReason,
      note: cancelNote
    }
  })

  res.json({
    code: 0,
    message: '已取消派单，订单已退回客服重新派单',
    data: {
      requiresCustomerApproval: false,
      order: attachCancelMeta(await presentOrderForApi(updated)),
      message: '取消后订单将退回客服重新派单'
    }
  })
}

exports.listCancellationRequests = async (req, res) => {
  const query = {}
  const status = String(req.query.status || '').trim()
  if (status) query.status = status

  if (req.user.role === 'user') {
    query.customerId = req.user.userId
    if (!status) query.status = REQUEST_STATUS.PENDING
  } else if (req.user.role === 'driver') {
    query.driverId = req.user.userId
    if (req.query.driverAck === '0' || req.query.unread === '1') {
      query.driverAckedAt = null
    }
  } else {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const items = await DriverCancellationRequest.find(query)
    .sort({ requestedAt: -1 })
    .limit(50)
    .lean()

  res.json({
    code: 0,
    message: 'success',
    data: { requests: items.map(presentRequest) }
  })
}

exports.ackCancellationDecision = async (req, res) => {
  if (req.user.role !== 'driver') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }
  const { id } = req.params
  assertValidObjectId(id, '申请 ID 无效')
  const doc = await DriverCancellationRequest.findOneAndUpdate(
    {
      _id: id,
      driverId: req.user.userId,
      status: { $in: [REQUEST_STATUS.REJECTED, REQUEST_STATUS.APPROVED] },
      driverAckedAt: null
    },
    { $set: { driverAckedAt: new Date() } },
    { new: true }
  )
  if (!doc) {
    const e = new Error('无可确认的取消结果')
    e.code = 400
    throw e
  }
  res.json({
    code: 0,
    message: 'success',
    data: { request: presentRequest(doc) }
  })
}

exports.approveCancellationRequest = async (req, res) => {
  if (req.user.role !== 'user') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }
  const { id } = req.params
  assertValidObjectId(id, '申请 ID 无效')

  const requestDoc = await DriverCancellationRequest.findOne({
    _id: id,
    customerId: req.user.userId,
    status: REQUEST_STATUS.PENDING
  })
  if (!requestDoc) {
    const e = new Error('取消申请不存在或已处理')
    e.code = 400
    throw e
  }

  const order = await Order.findById(requestDoc.orderId)
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  if (idOf(order.driverId) !== String(requestDoc.driverId)) {
    await DriverCancellationRequest.findByIdAndUpdate(requestDoc._id, {
      $set: { status: REQUEST_STATUS.CANCELLED, decidedAt: new Date(), decidedBy: req.user.userId }
    })
    const e = new Error('司机已变更，申请已失效')
    e.code = 400
    throw e
  }

  const updated = await applyUnassignToNeedsRedispatch({
    order,
    req,
    reason: requestDoc.reason,
    note: requestDoc.note,
    logAction: 'customer_approve_driver_cancel',
    logMessage: `乘客同意司机取消：${requestDoc.reason}${requestDoc.note ? ` · ${requestDoc.note}` : ''}，返回待重新派单`,
    notificationType: 'REDISPATCH_REQUIRED',
    notificationTitle: '有订单需要重新派单'
  })

  if (!updated) {
    const e = new Error('当前订单状态不可解除派单')
    e.code = 400
    throw e
  }

  requestDoc.status = REQUEST_STATUS.APPROVED
  requestDoc.decidedAt = new Date()
  requestDoc.decidedBy = req.user.userId
  await requestDoc.save()

  await createAdminNotification({
    type: 'DRIVER_CANCEL_REQUEST_APPROVED',
    orderId: updated._id,
    orderNo: updated.orderNo || '',
    title: '乘客已同意司机取消',
    body: `${updated.orderNo || ''} · 原司机 ${requestDoc.driverPhone} · ${requestDoc.reason}`,
    payload: {
      previousDriverPhone: requestDoc.driverPhone,
      reason: requestDoc.reason,
      note: requestDoc.note,
      pickup: updated.pickup || '',
      destination: updated.destination || '',
      pickupAt: requestDoc.pickupAt
    }
  })

  res.json({
    code: 0,
    message: '已同意取消，订单将由客服重新派单',
    data: {
      request: presentRequest(requestDoc),
      order: attachCancelMeta(await presentOrderForApi(updated))
    }
  })
}

exports.rejectCancellationRequest = async (req, res) => {
  if (req.user.role !== 'user') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }
  const { id } = req.params
  assertValidObjectId(id, '申请 ID 无效')

  const requestDoc = await DriverCancellationRequest.findOneAndUpdate(
    {
      _id: id,
      customerId: req.user.userId,
      status: REQUEST_STATUS.PENDING
    },
    {
      $set: {
        status: REQUEST_STATUS.REJECTED,
        decidedAt: new Date(),
        decidedBy: req.user.userId,
        driverAckedAt: null
      }
    },
    { new: true }
  )
  if (!requestDoc) {
    const e = new Error('取消申请不存在或已处理')
    e.code = 400
    throw e
  }

  await Order.findByIdAndUpdate(requestDoc.orderId, {
    $push: logPushPayload(
      req,
      'customer_reject_driver_cancel',
      '乘客未同意取消，原司机继续执行订单'
    ),
    $set: { updatedAt: new Date() }
  })

  const order = await Order.findById(requestDoc.orderId)
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({
    code: 0,
    message: '已拒绝取消，原司机继续执行订单',
    data: {
      request: presentRequest(requestDoc),
      order: order ? attachCancelMeta(await presentOrderForApi(order)) : null
    }
  })
}
