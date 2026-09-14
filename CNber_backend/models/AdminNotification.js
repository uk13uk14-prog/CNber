const mongoose = require('mongoose')

const NOTIFICATION_TYPES = [
  'NEW_ORDER',
  'DRIVER_CANCELLED',
  'REDISPATCH_REQUIRED',
  'DRIVER_CANCEL_REQUEST_APPROVED'
]

const NOTIFICATION_STATUS = {
  UNREAD: 'unread',
  READ: 'read',
  RESOLVED: 'resolved'
}

const AdminNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: [
      NOTIFICATION_STATUS.UNREAD,
      NOTIFICATION_STATUS.READ,
      NOTIFICATION_STATUS.RESOLVED
    ],
    default: NOTIFICATION_STATUS.UNREAD,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
    index: true
  },
  orderNo: { type: String, default: '', trim: true, index: true },
  title: { type: String, required: true, trim: true },
  body: { type: String, default: '', trim: true },
  payload: { type: Object, default: {} },
  readAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true }
})

AdminNotificationSchema.index({ status: 1, createdAt: -1 })
AdminNotificationSchema.index({ type: 1, status: 1, createdAt: -1 })

const AdminNotification = mongoose.model('AdminNotification', AdminNotificationSchema)

module.exports = AdminNotification
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES
module.exports.NOTIFICATION_STATUS = NOTIFICATION_STATUS
