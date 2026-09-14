const mongoose = require('mongoose')
const AdminNotification = require('../models/AdminNotification')
const { NOTIFICATION_STATUS } = AdminNotification
const { presentNotification } = require('../utils/adminNotifications')

exports.listAdminNotifications = async (req, res) => {
  const status = String(req.query.status || '').trim()
  const type = String(req.query.type || '').trim()
  const query = {}
  if (status) query.status = status
  else query.status = { $ne: NOTIFICATION_STATUS.RESOLVED }
  if (type) query.type = type

  const items = await AdminNotification.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  const [unreadCount, redispatchCount] = await Promise.all([
    AdminNotification.countDocuments({ status: NOTIFICATION_STATUS.UNREAD }),
    AdminNotification.countDocuments({
      type: 'REDISPATCH_REQUIRED',
      status: { $ne: NOTIFICATION_STATUS.RESOLVED }
    })
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      notifications: items.map(presentNotification),
      unreadCount,
      redispatchCount
    }
  })
}

exports.markAdminNotificationRead = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    const e = new Error('通知 ID 无效')
    e.code = 400
    throw e
  }
  const doc = await AdminNotification.findByIdAndUpdate(
    id,
    {
      $set: {
        status: NOTIFICATION_STATUS.READ,
        readAt: new Date()
      }
    },
    { new: true }
  )
  if (!doc) {
    const e = new Error('通知不存在')
    e.code = 404
    throw e
  }
  res.json({
    code: 0,
    message: 'success',
    data: { notification: presentNotification(doc) }
  })
}

exports.resolveAdminNotification = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    const e = new Error('通知 ID 无效')
    e.code = 400
    throw e
  }
  const doc = await AdminNotification.findByIdAndUpdate(
    id,
    {
      $set: {
        status: NOTIFICATION_STATUS.RESOLVED,
        resolvedAt: new Date()
      }
    },
    { new: true }
  )
  if (!doc) {
    const e = new Error('通知不存在')
    e.code = 404
    throw e
  }
  res.json({
    code: 0,
    message: 'success',
    data: { notification: presentNotification(doc) }
  })
}
