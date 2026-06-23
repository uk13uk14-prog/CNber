const mongoose = require('mongoose')

const CUSTOMER_TYPES = ['student', 'family', 'business', 'tourist', 'unknown']

const FrequentRouteSchema = new mongoose.Schema(
  {
    from: { type: String, default: '', trim: true },
    to: { type: String, default: '', trim: true },
    count: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null }
  },
  { _id: false }
)

const CustomerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    phone: { type: String, default: '', trim: true, index: true },
    name: { type: String, default: '', trim: true },
    wechat: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    preferredLanguage: { type: String, default: '', trim: true },
    customerType: {
      type: String,
      enum: CUSTOMER_TYPES,
      default: 'unknown'
    },
    frequentRoutes: { type: [FrequentRouteSchema], default: [] },
    preferredVehicleClasses: [{ type: String, trim: true }],
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    totalSpentCny: { type: Number, default: 0 },
    lastOrderAt: { type: Date, default: null },
    reviewCount: { type: Number, default: 0 },
    lastReviewAt: { type: Date, default: null },
    /** 订单聚合：最常用服务类型 */
    favoriteServiceType: { type: String, default: '', trim: true, index: true },
    tags: [{ type: String, trim: true }],
    notes: { type: String, default: '', trim: true },
    /** 仅 marketingConsent=true 的客户可进入后续营销候选池 */
    marketingConsent: { type: Boolean, default: false },
    marketingConsentAt: { type: Date, default: null },
    marketingOptOutAt: { type: Date, default: null },
    aiProfileSummary: { type: String, default: '', trim: true },
    aiLastAnalyzedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

CustomerProfileSchema.index({ tags: 1 })
CustomerProfileSchema.index({ lastOrderAt: -1 })

module.exports = mongoose.model('CustomerProfile', CustomerProfileSchema)
module.exports.CUSTOMER_TYPES = CUSTOMER_TYPES
