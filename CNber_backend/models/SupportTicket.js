const mongoose = require('mongoose')

const TICKET_TYPES = [
  'modify_order',
  'cancel_order',
  'refund_request',
  'complaint',
  'lost_item',
  'driver_issue',
  'order_issue',
  'passenger_no_show',
  'payment_issue',
  'vehicle_issue',
  'other'
]

const DRIVER_TICKET_TYPES = [
  'order_issue',
  'passenger_no_show',
  'payment_issue',
  'vehicle_issue',
  'complaint',
  'other'
]

const TICKET_STATUSES = ['pending', 'in_progress', 'resolved', 'closed']
const PRIORITIES = ['low', 'normal', 'high', 'urgent']
const REQUESTER_ROLES = ['customer', 'driver', 'admin']

const OperationLogSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true },
    action: { type: String, default: 'comment', trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, default: '', trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
)

const SupportTicketSchema = new mongoose.Schema(
  {
    ticketNo: { type: String, unique: true, sparse: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    orderNo: { type: String, default: '', trim: true, index: true },
    requesterUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    requesterPhone: { type: String, default: '', trim: true, index: true },
    requesterRole: {
      type: String,
      enum: REQUESTER_ROLES,
      default: 'customer'
    },
    type: { type: String, enum: TICKET_TYPES, required: true, index: true },
    priority: { type: String, enum: PRIORITIES, default: 'normal', index: true },
    status: { type: String, enum: TICKET_STATUSES, default: 'pending', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    attachments: { type: [String], default: [] },
    assignedStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedStaffName: { type: String, default: '', trim: true },
    resolution: { type: String, default: '', trim: true },
    operationLogs: { type: [OperationLogSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

SupportTicketSchema.index({ status: 1, createdAt: -1 })
SupportTicketSchema.index({ type: 1, status: 1 })

module.exports = mongoose.model('SupportTicket', SupportTicketSchema)
module.exports.TICKET_TYPES = TICKET_TYPES
module.exports.DRIVER_TICKET_TYPES = DRIVER_TICKET_TYPES
module.exports.TICKET_STATUSES = TICKET_STATUSES
module.exports.PRIORITIES = PRIORITIES
module.exports.REQUESTER_ROLES = REQUESTER_ROLES
