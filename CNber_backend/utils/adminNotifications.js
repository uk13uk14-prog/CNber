const AdminNotification = require('../models/AdminNotification')
const { NOTIFICATION_STATUS } = AdminNotification

async function createAdminNotification({
  type,
  orderId,
  orderNo,
  title,
  body,
  payload
}) {
  return AdminNotification.create({
    type,
    status: NOTIFICATION_STATUS.UNREAD,
    orderId: orderId || null,
    orderNo: orderNo || '',
    title: title || '通知',
    body: body || '',
    payload: payload || {},
    createdAt: new Date()
  })
}

async function resolveRedispatchNotifications(orderId) {
  if (!orderId) return { modifiedCount: 0 }
  const result = await AdminNotification.updateMany(
    {
      orderId,
      type: { $in: ['REDISPATCH_REQUIRED', 'DRIVER_CANCELLED', 'DRIVER_CANCEL_REQUEST_APPROVED'] },
      status: { $ne: NOTIFICATION_STATUS.RESOLVED }
    },
    {
      $set: {
        status: NOTIFICATION_STATUS.RESOLVED,
        resolvedAt: new Date()
      }
    }
  )
  return { modifiedCount: result.modifiedCount || 0 }
}

function presentNotification(doc) {
  if (!doc) return null
  const row = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return {
    id: String(row._id),
    type: row.type,
    status: row.status,
    orderId: row.orderId ? String(row.orderId) : '',
    orderNo: row.orderNo || '',
    title: row.title || '',
    body: row.body || '',
    payload: row.payload || {},
    createdAt: row.createdAt,
    readAt: row.readAt,
    resolvedAt: row.resolvedAt
  }
}

module.exports = {
  createAdminNotification,
  resolveRedispatchNotifications,
  presentNotification
}
