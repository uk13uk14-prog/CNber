const mongoose = require('mongoose')

const ACTIONS = ['export_csv', 'manual_contact', 'note']

const MarketingLogSchema = new mongoose.Schema(
  {
    audienceId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingAudience', index: true },
    audienceName: { type: String, default: '', trim: true },
    action: { type: String, enum: ACTIONS, required: true, index: true },
    customerCount: { type: Number, default: 0, min: 0 },
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    operatorPhone: { type: String, default: '', trim: true },
    remark: { type: String, default: '', trim: true }
  },
  { timestamps: true }
)

MarketingLogSchema.index({ createdAt: -1 })
MarketingLogSchema.index({ audienceId: 1, createdAt: -1 })

module.exports = mongoose.model('MarketingLog', MarketingLogSchema)
module.exports.ACTIONS = ACTIONS
