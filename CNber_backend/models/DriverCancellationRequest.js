const mongoose = require('mongoose')

const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
}

const DriverCancellationRequestSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  orderNo: { type: String, default: '', trim: true, index: true },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  driverPhone: { type: String, default: '', trim: true },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  customerPhone: { type: String, default: '', trim: true },
  reason: { type: String, required: true, trim: true },
  note: { type: String, default: '', trim: true },
  requestedAt: { type: Date, default: Date.now, index: true },
  hoursBeforePickup: { type: Number, default: null },
  requiresCustomerApproval: { type: Boolean, default: true },
  status: {
    type: String,
    enum: [
      REQUEST_STATUS.PENDING,
      REQUEST_STATUS.APPROVED,
      REQUEST_STATUS.REJECTED,
      REQUEST_STATUS.CANCELLED
    ],
    default: REQUEST_STATUS.PENDING,
    index: true
  },
  decidedAt: { type: Date, default: null },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  driverAckedAt: { type: Date, default: null },
  pickup: { type: String, default: '', trim: true },
  destination: { type: String, default: '', trim: true },
  pickupAt: { type: Date, default: null }
})

DriverCancellationRequestSchema.index({ customerId: 1, status: 1, requestedAt: -1 })
DriverCancellationRequestSchema.index({ driverId: 1, status: 1, requestedAt: -1 })
DriverCancellationRequestSchema.index({ orderId: 1, status: 1 })

const DriverCancellationRequest = mongoose.model(
  'DriverCancellationRequest',
  DriverCancellationRequestSchema
)

module.exports = DriverCancellationRequest
module.exports.REQUEST_STATUS = REQUEST_STATUS
