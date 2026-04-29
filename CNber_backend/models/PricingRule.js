const mongoose = require('mongoose')

const SERVICE_TYPES = ['ride', 'pickup', 'dropoff', 'charter', 'point']

const DEFAULT_PRICING_RULES = [
  { serviceType: 'ride', baseFare: 20, perMile: 2.5, perMinute: 0.4 },
  {
    serviceType: 'pickup',
    baseFare: 35,
    perMile: 3,
    perMinute: 0.5,
    airportSurcharge: 15
  },
  {
    serviceType: 'dropoff',
    baseFare: 30,
    perMile: 2.8,
    perMinute: 0.45,
    airportSurcharge: 10
  },
  { serviceType: 'charter', baseFare: 80, perMile: 3.5, perMinute: 0.8 },
  { serviceType: 'point', baseFare: 15, perMile: 2.2, perMinute: 0.35 }
]

const PricingRuleSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      enum: SERVICE_TYPES,
      required: true,
      unique: true,
      index: true
    },
    baseFare: { type: Number, default: 0 },
    perMile: { type: Number, default: 0 },
    perMinute: { type: Number, default: 0 },
    airportSurcharge: { type: Number, default: 0 },
    nightSurcharge: { type: Number, default: 0 },
    serviceMultiplier: { type: Number, default: 1 },
    enabled: { type: Boolean, default: true },
    note: { type: String, default: '' }
  },
  { timestamps: true }
)

PricingRuleSchema.statics.ensureDefaultRules = async function () {
  const count = await this.countDocuments()
  if (count > 0) return
  await this.insertMany(DEFAULT_PRICING_RULES)
}

const PricingRule = mongoose.model('PricingRule', PricingRuleSchema)

module.exports = PricingRule
module.exports.SERVICE_TYPES = SERVICE_TYPES
module.exports.DEFAULT_PRICING_RULES = DEFAULT_PRICING_RULES
