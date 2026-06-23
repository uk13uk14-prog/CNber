const mongoose = require('mongoose')

const RATING_TAGS = [
  '准时',
  '服务好',
  '车辆干净',
  '驾驶平稳',
  '沟通顺畅',
  '推荐',
  '迟到',
  '车辆不符',
  '服务一般'
]

const POSITIVE_TAGS = ['准时', '服务好', '车辆干净', '驾驶平稳', '沟通顺畅', '推荐']
const NEGATIVE_TAGS = ['迟到', '车辆不符', '服务一般']

const OrderRatingSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    orderNo: { type: String, default: '', trim: true, index: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    customerPhone: { type: String, default: '', trim: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    driverPhone: { type: String, default: '', trim: true },
    driverStars: { type: Number, required: true, min: 1, max: 5 },
    serviceStars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
)

OrderRatingSchema.index({ orderId: 1, customerId: 1 }, { unique: true })

module.exports = mongoose.model('OrderRating', OrderRatingSchema)
module.exports.RATING_TAGS = RATING_TAGS
module.exports.POSITIVE_TAGS = POSITIVE_TAGS
module.exports.NEGATIVE_TAGS = NEGATIVE_TAGS
