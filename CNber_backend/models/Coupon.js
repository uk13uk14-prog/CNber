const mongoose = require('mongoose')

const CouponSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    type: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
    discountAmountCny: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    minSpendCny: { type: Number, default: 0, min: 0 },
    serviceTypes: { type: [String], default: [] },
    vehicleClasses: { type: [String], default: [] },
    usageLimit: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 0 },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    enabled: { type: Boolean, default: true },
    remark: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
)

CouponSchema.index({ enabled: 1, startAt: 1, endAt: 1 })

module.exports = mongoose.model('Coupon', CouponSchema)
