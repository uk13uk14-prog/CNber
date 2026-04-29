const mongoose = require('mongoose')

/**
 * 主流程：pending → assigned（后台已指派司机）→ accepted（司机确认接单）→ started → completed
 * 扩展：cancelled；司机仍可从 pending 池直接抢单 → accepted（见 order 路由 TODO 说明）
 */
const ORDER_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  STARTED: 'started',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

const DISPATCH_STATUS = {
  UNASSIGNED: 'unassigned',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
}

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedDriverName: { type: String, default: '', trim: true },
  assignedDriverPhone: { type: String, default: '', trim: true },
  assignedAt: { type: Date, default: null },
  dispatchStatus: {
    type: String,
    enum: [
      DISPATCH_STATUS.UNASSIGNED,
      DISPATCH_STATUS.ASSIGNED,
      DISPATCH_STATUS.ACCEPTED,
      DISPATCH_STATUS.REJECTED,
      DISPATCH_STATUS.COMPLETED
    ],
    default: DISPATCH_STATUS.UNASSIGNED
  },
  orderNo: { type: String, unique: true, sparse: true, index: true },
  orderDateKey: { type: String, index: true },
  dailySeq: { type: Number, default: null },
  status: {
    type: String,
    enum: [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.ASSIGNED,
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.STARTED,
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.CANCELLED
    ],
    default: ORDER_STATUS.PENDING
  },
  pickup: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  /** 后台/客户端展示用：ride | pickup | dropoff | charter 等 */
  serviceType: { type: String, default: 'ride', trim: true },
  airport: { type: String, default: '', trim: true },
  pickupAirport: { type: String, default: '', trim: true },
  dropoffAirport: { type: String, default: '', trim: true },
  flightAirport: { type: String, default: '', trim: true },
  pickupPostcode: { type: String, default: '', trim: true },
  dropoffPostcode: { type: String, default: '', trim: true },
  pickupDetail: { type: String, default: '', trim: true },
  dropoffDetail: { type: String, default: '', trim: true },
  postcode: { type: String, default: '', trim: true },
  addressPostcode: { type: String, default: '', trim: true },
  destinationPostcode: { type: String, default: '', trim: true },
  amount: { type: Number, default: null },
  priceStatus: {
    type: String,
    enum: ['pending', 'quoted', 'confirmed'],
    default: 'pending'
  },
  quoteSource: {
    type: String,
    enum: ['manual', 'rule', 'matrix'],
    default: 'manual'
  },
  quoteBreakdown: { type: Object, default: {} },
  /** 模拟支付状态；不接真实支付网关 */
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'pending', 'paid', 'refunded'],
    default: 'unpaid'
  },
  followUpNotes: [
    {
      content: { type: String, required: true, trim: true },
      createdAt: { type: Date, default: Date.now },
      authorPhone: { type: String, default: '' },
      authorStaffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      /** 创建人展示快照（一般为管理员手机号） */
      authorDisplay: { type: String, default: '' }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const Order = mongoose.model('Order', OrderSchema)

module.exports = Order
module.exports.ORDER_STATUS = ORDER_STATUS
module.exports.DISPATCH_STATUS = DISPATCH_STATUS
