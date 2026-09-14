const Order = require('../models/Order')
const ORDER_STATUS = Order.ORDER_STATUS
const DISPATCH_STATUS = Order.DISPATCH_STATUS
const { logPushPayload } = require('./operationLog')
const { createAdminNotification } = require('./adminNotifications')
const { parseOrderPickupAt, hoursUntilPickup } = require('./scheduledPickup')

const DRIVER_CANCEL_ALLOWED_STATUSES = [
  ORDER_STATUS.ASSIGNED,
  ORDER_STATUS.DRIVER_ACCEPTED,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.READY_TO_START
]

const CANCEL_REASONS = ['车辆故障', '身体原因', '时间冲突', '突发情况', '其他']

function phoneOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref.phone) return String(ref.phone)
  return ''
}

function idOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref._id) return String(ref._id)
  return String(ref)
}

function normalizeCancelReason(reason, note) {
  const raw = String(reason || '').trim()
  if (!CANCEL_REASONS.includes(raw)) {
    const e = new Error('请选择取消原因')
    e.code = 400
    throw e
  }
  const extra = String(note || '').trim()
  if (raw === '其他' && extra.length < 2) {
    const e = new Error('请填写取消备注')
    e.code = 400
    throw e
  }
  return { reason: raw, note: extra }
}

async function applyUnassignToNeedsRedispatch({
  order,
  req,
  reason,
  note,
  logAction,
  logMessage,
  notificationType,
  notificationTitle
}) {
  const driverId = order.driverId && (order.driverId._id || order.driverId)
  const prevPhone = order.assignedDriverPhone || phoneOf(order.driverId)
  const pickupAt = parseOrderPickupAt(order)
  const hours = hoursUntilPickup(order)

  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      driverId,
      status: { $in: DRIVER_CANCEL_ALLOWED_STATUSES }
    },
    {
      $set: {
        driverId: null,
        assignedDriver: null,
        assignedDriverName: '',
        assignedDriverPhone: '',
        assignedAt: null,
        status: ORDER_STATUS.NEEDS_REDISPATCH,
        dispatchStatus: DISPATCH_STATUS.NEEDS_REDISPATCH,
        updatedAt: new Date()
      },
      $push: logPushPayload(req, logAction, logMessage)
    },
    { new: true }
  )

  if (!updated) return null

  await createAdminNotification({
    type: notificationType || 'REDISPATCH_REQUIRED',
    orderId: updated._id,
    orderNo: updated.orderNo || '',
    title: notificationTitle || '有订单需要重新派单',
    body: [
      updated.orderNo || '',
      prevPhone ? `原司机 ${prevPhone}` : '',
      reason ? `原因：${reason}` : '',
      note ? `备注：${note}` : ''
    ]
      .filter(Boolean)
      .join(' · '),
    payload: {
      previousDriverId: driverId ? String(driverId) : '',
      previousDriverPhone: prevPhone,
      reason: reason || '',
      note: note || '',
      pickup: updated.pickup || '',
      destination: updated.destination || '',
      pickupAt: pickupAt ? pickupAt.toISOString() : '',
      hoursBeforePickup: hours
    }
  })

  return updated
}

module.exports = {
  DRIVER_CANCEL_ALLOWED_STATUSES,
  CANCEL_REASONS,
  phoneOf,
  idOf,
  normalizeCancelReason,
  applyUnassignToNeedsRedispatch
}
