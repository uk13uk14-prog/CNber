const mongoose = require('mongoose')

const PROFILE_TYPES = ['customer', 'driver']
const RISK_LEVELS = ['none', 'low', 'medium', 'high']

const AIProfileInsightSchema = new mongoose.Schema(
  {
    profileType: {
      type: String,
      enum: PROFILE_TYPES,
      required: true,
      index: true
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    summary: { type: String, default: '', trim: true },
    tags: [{ type: String, trim: true }],
    riskLevel: {
      type: String,
      enum: RISK_LEVELS,
      default: 'none'
    },
    recommendations: [{ type: String, trim: true }],
    /** V1 规则引擎 = 1；后续 GPT/Ollama 递增 */
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
)

AIProfileInsightSchema.index({ profileType: 1, profileId: 1, createdAt: -1 })

module.exports = mongoose.model('AIProfileInsight', AIProfileInsightSchema)
module.exports.PROFILE_TYPES = PROFILE_TYPES
module.exports.RISK_LEVELS = RISK_LEVELS
