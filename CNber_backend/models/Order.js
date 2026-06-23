const mongoose = require('mongoose')

/**
 * V1 预约制流程：created → quoted → confirmed → deposit_paid → assigned
 * → driver_accepted → ready_to_start → in_progress → arrived → completed
 * 兼容旧状态：pending / accepted / started
 */
const ORDER_STATUS = {
  CREATED: 'created',
  QUOTED: 'quoted',
  CONFIRMED: 'confirmed',
  DEPOSIT_PAID: 'deposit_paid',
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  DRIVER_ACCEPTED: 'driver_accepted',
  ACCEPTED: 'accepted',
  READY_TO_START: 'ready_to_start',
  IN_PROGRESS: 'in_progress',
  STARTED: 'started',
  ARRIVED: 'arrived',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

const DISPATCH_STATUS = {
  PENDING: 'pending',
  UNASSIGNED: 'unassigned',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
}

const PAYMENT_STAGES = [
  'none',
  'deposit_pending',
  'deposit_submitted',
  'deposit_confirmed',
  'balance_pending',
  'balance_submitted',
  'balance_confirmed',
  'completed'
]

const DEPOSIT_STATUSES = ['unpaid', 'pending', 'submitted', 'confirmed', 'rejected', 'refunded']
const BALANCE_STATUSES = ['unpaid', 'pending', 'submitted', 'confirmed', 'rejected', 'refunded']

const EXCEPTION_TYPES = [
  'cancelled_by_customer',
  'cancelled_by_admin',
  'driver_rejected',
  'driver_timeout',
  'price_changed',
  'refund_pending',
  'refunded',
  'dispute_open',
  'dispute_closed'
]

const SERVICE_STATUSES = ['active', 'on_hold', 'exception', 'dispute', 'closed']
const SETTLEMENT_STATUSES = ['unsettled', 'partially_settled', 'settled']

const CommunicationLogSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorDisplay: { type: String, default: '', trim: true }
  },
  { _id: true }
)

const OrderPaymentSchema = new mongoose.Schema(
  {
    depositStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'confirmed'],
      default: 'unpaid'
    },
    balanceStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'confirmed'],
      default: 'unpaid'
    },
    depositConfirmedAt: { type: Date, default: null },
    balanceConfirmedAt: { type: Date, default: null },
    depositAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentNote: { type: String, default: '', trim: true }
  },
  { _id: false }
)
const DRIVER_SETTLEMENT_STATUSES = ['not_required', 'pending', 'paid']

const ManualPaymentInfoSchema = new mongoose.Schema(
  {
    method: { type: String, default: '', trim: true },
    paymentMethod: { type: String, default: '', trim: true },
    paymentAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentAccount',
      default: null
    },
    payerName: { type: String, default: '', trim: true },
    paidAmount: { type: Number, default: null },
    /** 客户填写的微信/支付宝转账流水号，供后台人工核对 */
    transactionRef: { type: String, default: '', trim: true },
    remark: { type: String, default: '', trim: true },
    proofImage: { type: String, default: '', trim: true },
    submittedAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedReason: { type: String, default: '', trim: true }
  },
  { _id: false }
)

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
      DISPATCH_STATUS.PENDING,
      DISPATCH_STATUS.UNASSIGNED,
      DISPATCH_STATUS.ASSIGNED,
      DISPATCH_STATUS.ACCEPTED,
      DISPATCH_STATUS.REJECTED,
      DISPATCH_STATUS.CANCELLED,
      DISPATCH_STATUS.COMPLETED
    ],
    default: DISPATCH_STATUS.PENDING
  },
  orderNo: { type: String, unique: true, sparse: true, index: true },
  orderDateKey: { type: String, index: true },
  dailySeq: { type: Number, default: null },
  status: {
    type: String,
    enum: [
      ORDER_STATUS.CREATED,
      ORDER_STATUS.QUOTED,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.DEPOSIT_PAID,
      ORDER_STATUS.PENDING,
      ORDER_STATUS.ASSIGNED,
      ORDER_STATUS.DRIVER_ACCEPTED,
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.READY_TO_START,
      ORDER_STATUS.IN_PROGRESS,
      ORDER_STATUS.STARTED,
      ORDER_STATUS.ARRIVED,
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.CANCELLED
    ],
    default: ORDER_STATUS.CREATED
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
  /** 车型等级 V1 */
  vehicleClass: { type: String, default: 'standard_5', trim: true, index: true },
  vehicleLabel: { type: String, default: '5座普通', trim: true },
  routeFromLabel: { type: String, default: '', trim: true },
  routeToLabel: { type: String, default: '', trim: true },
  pricingSource: {
    type: String,
    enum: ['legacy', 'route_fixed', 'service_default', 'fixed'],
    default: 'legacy'
  },
  amount: { type: Number, default: null },
  /** V1 固定报价（CNY 客户价 / GBP 司机价） */
  pricingMode: { type: String, enum: ['legacy', 'fixed'], default: 'legacy' },
  customerPriceCny: { type: Number, default: null },
  driverPriceGbp: { type: Number, default: null },
  /** 优惠码快照（V1：提交付款时写入，不扣库存） */
  couponCode: { type: String, default: '', trim: true, uppercase: true },
  discountAmountCny: { type: Number, default: null },
  originalAmountCny: { type: Number, default: null },
  payableAmountCny: { type: Number, default: null },
  exchangeRate: { type: Number, default: null },
  driverSettlementCny: { type: Number, default: null },
  platformProfitCny: { type: Number, default: null },
  priceStatus: {
    type: String,
    enum: ['pending', 'quoted', 'confirmed'],
    default: 'pending'
  },
  quoteSource: {
    type: String,
    enum: ['manual', 'rule', 'matrix', 'fixed', 'route_fixed'],
    default: 'manual'
  },
  quoteBreakdown: { type: Object, default: {} },
  priceBreakdown: {
    basePrice: { type: Number, default: 0 },
    nightFee: { type: Number, default: 0 },
    waitingFee: { type: Number, default: 0 },
    childSeatFee: { type: Number, default: 0 },
    meetGreetFee: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    driverPayout: { type: Number, default: 0 },
    platformProfit: { type: Number, default: 0 }
  },
  depositAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  /** 尾款金额（与 remainingAmount 对齐维护；人工收款流程用） */
  balanceAmount: { type: Number, default: 0 },
  /** 订单总价快照 */
  totalAmount: { type: Number, default: null },
  depositPaid: { type: Boolean, default: false },
  remainingPaid: { type: Boolean, default: false },
  paidAmount: { type: Number, default: 0 },
  paymentStage: {
    type: String,
    enum: PAYMENT_STAGES,
    default: 'none'
  },
  /** MVP 人工支付（与顶层 depositStatus 等字段同步维护） */
  payment: { type: OrderPaymentSchema, default: () => ({}) },
  depositStatus: {
    type: String,
    enum: DEPOSIT_STATUSES,
    default: 'unpaid'
  },
  balanceStatus: {
    type: String,
    enum: BALANCE_STATUSES,
    default: 'unpaid'
  },
  depositPaymentInfo: { type: ManualPaymentInfoSchema, default: () => ({}) },
  balancePaymentInfo: { type: ManualPaymentInfoSchema, default: () => ({}) },
  depositProofImage: { type: String, default: '', trim: true },
  depositNote: { type: String, default: '', trim: true },
  depositConfirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  depositConfirmedAt: { type: Date, default: null },
  balanceProofImage: { type: String, default: '', trim: true },
  balanceNote: { type: String, default: '', trim: true },
  balanceConfirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  balanceConfirmedAt: { type: Date, default: null },
  /** P0 异常与人工处理 */
  exceptionType: {
    type: String,
    enum: EXCEPTION_TYPES,
    default: undefined
  },
  exceptionReason: { type: String, default: '', trim: true },
  exceptionNotes: { type: String, default: '', trim: true },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  handledAt: { type: Date, default: null },
  /** 客服 SOP */
  internalNotes: [CommunicationLogSchema],
  customerCommunicationLogs: [CommunicationLogSchema],
  driverCommunicationLogs: [CommunicationLogSchema],
  nextAction: { type: String, default: '', trim: true },
  nextActionAt: { type: Date, default: null },
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  serviceStatus: {
    type: String,
    enum: SERVICE_STATUSES,
    default: 'active'
  },
  settlementStatus: {
    type: String,
    enum: SETTLEMENT_STATUSES,
    default: 'unsettled'
  },
  refundAmount: { type: Number, default: 0 },
  driverSettlementStatus: {
    type: String,
    enum: DRIVER_SETTLEMENT_STATUSES,
    default: 'not_required'
  },
  driverSettlementAmount: { type: Number, default: null },
  driverSettlementConfirmedAt: { type: Date, default: null },
  driverSettlementConfirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  /** 模拟支付状态；不接真实支付网关 */
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'pending', 'paid', 'refunded'],
    default: 'unpaid'
  },
  /** 乘客评价状态 */
  ratingStatus: {
    type: String,
    enum: ['unrated', 'rated'],
    default: 'unrated',
    index: true
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
  operationLogs: [
    {
      action: { type: String, required: true, trim: true },
      operatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      operatorPhone: { type: String, default: '', trim: true },
      message: { type: String, default: '', trim: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  /** 软删除：不从 MongoDB 物理移除，默认列表隐藏 */
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deleteReason: { type: String, default: '', trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const Order = mongoose.model('Order', OrderSchema)

module.exports = Order
module.exports.ORDER_STATUS = ORDER_STATUS
module.exports.DISPATCH_STATUS = DISPATCH_STATUS
module.exports.PAYMENT_STAGES = PAYMENT_STAGES
module.exports.DEPOSIT_STATUSES = DEPOSIT_STATUSES
module.exports.BALANCE_STATUSES = BALANCE_STATUSES
module.exports.DRIVER_SETTLEMENT_STATUSES = DRIVER_SETTLEMENT_STATUSES
module.exports.EXCEPTION_TYPES = EXCEPTION_TYPES
module.exports.SERVICE_STATUSES = SERVICE_STATUSES
module.exports.SETTLEMENT_STATUSES = SETTLEMENT_STATUSES
