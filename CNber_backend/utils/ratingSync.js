const OrderRating = require('../models/OrderRating')
const { POSITIVE_TAGS, NEGATIVE_TAGS } = require('../models/OrderRating')
const DriverProfile = require('../models/DriverProfile')
const CustomerProfile = require('../models/CustomerProfile')
const { roundMoney } = require('./pricing')

function tagFrequency(rows, allowed) {
  const counts = new Map()
  for (const row of rows) {
    for (const tag of row.tags || []) {
      if (!allowed.includes(tag)) continue
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 12)
}

async function recalcDriverRatingProfile(driverId) {
  if (!driverId) return null
  const ratings = await OrderRating.find({ driverId }).lean()
  const count = ratings.length
  if (!count) {
    return DriverProfile.findOneAndUpdate(
      { userId: driverId },
      {
        $set: {
          customerRatingAvg: null,
          ratingCount: 0,
          positiveTags: [],
          negativeTags: []
        }
      },
      { upsert: true, new: true }
    ).lean()
  }

  const sum = ratings.reduce((acc, r) => acc + Number(r.driverStars || 0), 0)
  const avg = roundMoney(sum / count)
  const positiveTags = tagFrequency(ratings, POSITIVE_TAGS)
  const negativeTags = tagFrequency(ratings, NEGATIVE_TAGS)

  return DriverProfile.findOneAndUpdate(
    { userId: driverId },
    {
      $set: {
        customerRatingAvg: avg,
        ratingCount: count,
        positiveTags,
        negativeTags
      }
    },
    { upsert: true, new: true }
  ).lean()
}

async function recalcCustomerReviewProfile(customerId, lastReviewAt) {
  if (!customerId) return null
  const count = await OrderRating.countDocuments({ customerId })
  return CustomerProfile.findOneAndUpdate(
    { userId: customerId },
    {
      $set: {
        reviewCount: count,
        lastReviewAt: lastReviewAt || new Date()
      }
    },
    { upsert: true, new: true }
  ).lean()
}

/**
 * 评价写入后同步司机/客户画像
 * @param {import('../models/OrderRating')} rating
 */
async function syncProfilesAfterRating(rating) {
  if (!rating) return
  const driverId = rating.driverId
  const customerId = rating.customerId
  await Promise.all([
    recalcDriverRatingProfile(driverId),
    recalcCustomerReviewProfile(customerId, rating.createdAt || new Date())
  ])
}

function toRatingDto(doc) {
  const row = doc?.toObject ? doc.toObject() : { ...doc }
  return {
    _id: row._id,
    orderId: row.orderId,
    orderNo: row.orderNo || '',
    customerId: row.customerId,
    customerPhone: row.customerPhone || '',
    driverId: row.driverId,
    driverPhone: row.driverPhone || '',
    driverStars: row.driverStars,
    serviceStars: row.serviceStars,
    comment: row.comment || '',
    tags: row.tags || [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

module.exports = {
  syncProfilesAfterRating,
  recalcDriverRatingProfile,
  recalcCustomerReviewProfile,
  toRatingDto
}
