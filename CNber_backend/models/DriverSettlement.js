const mongoose = require('mongoose')

const PERIOD_TYPES = ['daily', 'three_day', 'seven_day', 'fourteen_day', 'custom', 'monthly']
const STATUSES = ['pending', 'paid']
const PAYMENT_METHODS = ['bank_transfer', 'wise', 'cash', 'wechat', 'alipay', 'other']

const DriverSettlementSchema = new mongoose.Schema(
  {
    periodType: {
      type: String,
      enum: PERIOD_TYPES,
      required: true,
      index: true
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    periodLabel: { type: String, default: '', trim: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    driverPhone: { type: String, default: '', trim: true },
    driverName: { type: String, default: '', trim: true },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    orderCount: { type: Number, default: 0, min: 0 },
    driverSettlementGbp: { type: Number, default: 0, min: 0 },
    exchangeRate: { type: Number, default: 0, min: 0 },
    payableCny: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    paidAt: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: false },
    paymentReference: { type: String, default: '', trim: true },
    paymentProofUrl: { type: String, default: '', trim: true },
    paymentRemark: { type: String, default: '', trim: true },
    remark: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
)

DriverSettlementSchema.index({ driverId: 1, periodType: 1, startDate: 1, endDate: 1 }, { unique: true })

module.exports = mongoose.model('DriverSettlement', DriverSettlementSchema)
module.exports.PERIOD_TYPES = PERIOD_TYPES
module.exports.STATUSES = STATUSES
module.exports.PAYMENT_METHODS = PAYMENT_METHODS
