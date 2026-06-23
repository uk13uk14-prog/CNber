const mongoose = require('mongoose')

const DEFAULT_FIXED_RULES = [
  { serviceType: 'point', customerPriceCny: 900, driverPriceGbp: 80, remark: 'V1 点对点' },
  { serviceType: 'pickup', customerPriceCny: 900, driverPriceGbp: 75, remark: 'V1 接机' },
  { serviceType: 'dropoff', customerPriceCny: 900, driverPriceGbp: 75, remark: 'V1 送机' },
  { serviceType: 'charter', customerPriceCny: 3000, driverPriceGbp: 220, remark: 'V1 包车' },
  { serviceType: 'ride', customerPriceCny: 900, driverPriceGbp: 80, remark: 'V1 普通用车' }
]

const FixedPricingRuleSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    customerPriceCny: { type: Number, required: true, min: 0 },
    driverPriceGbp: { type: Number, required: true, min: 0 },
    enabled: { type: Boolean, default: true },
    remark: { type: String, default: '', trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
)

FixedPricingRuleSchema.statics.ensureDefaultRules = async function () {
  for (const row of DEFAULT_FIXED_RULES) {
    await this.findOneAndUpdate(
      { serviceType: row.serviceType },
      {
        $setOnInsert: {
          customerPriceCny: row.customerPriceCny,
          driverPriceGbp: row.driverPriceGbp,
          enabled: true,
          remark: row.remark
        }
      },
      { upsert: true, new: true }
    )
  }
}

const FixedPricingRule = mongoose.model('FixedPricingRule', FixedPricingRuleSchema)

module.exports = FixedPricingRule
module.exports.DEFAULT_FIXED_RULES = DEFAULT_FIXED_RULES
