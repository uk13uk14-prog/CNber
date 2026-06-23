const mongoose = require('mongoose')

const RoutePricingRuleSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    fromLabel: { type: String, required: true, trim: true },
    toLabel: { type: String, required: true, trim: true },
    fromKey: { type: String, required: true, trim: true, index: true },
    toKey: { type: String, required: true, trim: true, index: true },
    vehicleClass: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    vehicleLabel: { type: String, default: '', trim: true },
    customerPriceCny: { type: Number, required: true, min: 0 },
    driverPriceGbp: { type: Number, required: true, min: 0 },
    enabled: { type: Boolean, default: true, index: true },
    remark: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
)

RoutePricingRuleSchema.index(
  { serviceType: 1, fromKey: 1, toKey: 1, vehicleClass: 1 },
  { unique: true }
)

const RoutePricingRule = mongoose.model('RoutePricingRule', RoutePricingRuleSchema)

/** @deprecated 兼容旧引用，请用 VehicleClassConfig */
const VEHICLE_CLASSES = [
  'standard_5',
  'luxury_5',
  'comfort_7',
  'luxury_7',
  'seater_8',
  'seater_9'
]

const VEHICLE_CLASS_LABELS = {
  standard_5: '5座普通',
  luxury_5: '5座豪华',
  comfort_7: '7座舒适',
  luxury_7: '7座豪华',
  seater_8: '8座',
  seater_9: '9座'
}

module.exports = RoutePricingRule
module.exports.VEHICLE_CLASSES = VEHICLE_CLASSES
module.exports.VEHICLE_CLASS_LABELS = VEHICLE_CLASS_LABELS
