const mongoose = require('mongoose')

const CampaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    bannerUrl: { type: String, default: '', trim: true },
    linkedCouponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    linkedCouponCode: { type: String, default: '', trim: true, uppercase: true },
    targetServiceTypes: { type: [String], default: [] },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    enabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    remark: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
)

CampaignSchema.index({ enabled: 1, startAt: 1, endAt: 1 })
CampaignSchema.index({ sortOrder: 1, startAt: -1 })

module.exports = mongoose.model('Campaign', CampaignSchema)
