const mongoose = require('mongoose')

const AudienceFiltersSchema = new mongoose.Schema(
  {
    preset: { type: String, default: '', trim: true },
    totalOrdersMin: { type: Number, default: null },
    totalOrdersMax: { type: Number, default: null },
    totalSpentCnyMin: { type: Number, default: null },
    totalSpentCnyMax: { type: Number, default: null },
    lastOrderAtAfter: { type: Date, default: null },
    lastOrderAtBefore: { type: Date, default: null },
    favoriteServiceType: { type: String, default: '', trim: true },
    aiTagsInclude: { type: [String], default: [] },
    marketingConsent: { type: Boolean, default: null },
    customerType: { type: String, default: '', trim: true },
    hasComplaint: { type: Boolean, default: null }
  },
  { _id: false }
)

const CreatedBySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    phone: { type: String, default: '', trim: true },
    displayName: { type: String, default: '', trim: true }
  },
  { _id: false }
)

const MarketingAudienceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '', trim: true },
    filters: { type: AudienceFiltersSchema, default: () => ({}) },
    customerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CustomerProfile' }],
    count: { type: Number, default: 0 },
    createdBy: { type: CreatedBySchema, default: () => ({}) }
  },
  { timestamps: true }
)

MarketingAudienceSchema.index({ createdAt: -1 })

module.exports = mongoose.model('MarketingAudience', MarketingAudienceSchema)
