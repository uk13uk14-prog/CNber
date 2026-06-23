const mongoose = require('mongoose')
const Order = require('../models/Order')
const OrderRating = require('../models/OrderRating')
const User = require('../models/User')
const { RATING_TAGS } = require('../models/OrderRating')
const ORDER_STATUS = Order.ORDER_STATUS
const { syncProfilesAfterRating, toRatingDto } = require('../utils/ratingSync')

function userIdOf(req) {
  return req.user?.userId || req.user?._id || null
}

function formatOrderNo(order) {
  if (order?.orderNo) return String(order.orderNo)
  if (order?.orderDateKey && order?.dailySeq != null) {
    return `${order.orderDateKey}-${String(order.dailySeq).padStart(3, '0')}`
  }
  return ''
}

function parseStars(value, label) {
  const n = parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1 || n > 5) {
    const e = new Error(`${label} 须为 1-5 的整数`)
    e.code = 400
    throw e
  }
  return n
}

function parseTags(raw) {
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : []
  const out = []
  for (const tag of list) {
    const t = String(tag || '').trim()
    if (!t) continue
    if (!RATING_TAGS.includes(t)) {
      const e = new Error(`标签无效：${t}`)
      e.code = 400
      throw e
    }
    if (!out.includes(t)) out.push(t)
  }
  return out
}

function assertCustomer(req) {
  if (req.user?.role !== 'user') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }
}

function assertDriver(req) {
  if (req.user?.role !== 'driver') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }
}

function driverIdOf(order) {
  const d = order.driverId || order.assignedDriver
  if (!d) return null
  return d._id || d
}

/** POST /api/order/rating */
exports.submitOrderRating = async (req, res) => {
  assertCustomer(req)

  const orderId = String(req.body?.orderId || '').trim()
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }

  const driverStars = parseStars(req.body?.driverStars, '司机评分')
  const serviceStars = parseStars(req.body?.serviceStars, '服务评分')
  const comment = String(req.body?.comment ?? '').trim()
  const tags = parseTags(req.body?.tags)

  const order = await Order.findById(orderId).lean()
  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  const customerId = userIdOf(req)
  if (String(order.userId) !== String(customerId)) {
    const e = new Error('无权评价该订单')
    e.code = 403
    throw e
  }

  if (order.status !== ORDER_STATUS.COMPLETED) {
    const e = new Error('仅已完成订单可评价')
    e.code = 400
    throw e
  }

  if (order.ratingStatus === 'rated') {
    const e = new Error('该订单已评价')
    e.code = 400
    throw e
  }

  const existing = await OrderRating.findOne({ orderId, customerId }).lean()
  if (existing) {
    const e = new Error('该订单已评价')
    e.code = 400
    throw e
  }

  const driverId = driverIdOf(order)
  const [customer, driver] = await Promise.all([
    User.findById(customerId).select('phone').lean(),
    driverId ? User.findById(driverId).select('phone').lean() : null
  ])

  let rating
  try {
    rating = await OrderRating.create({
      orderId,
      orderNo: formatOrderNo(order),
      customerId,
      customerPhone: customer?.phone || req.user?.phone || '',
      driverId,
      driverPhone: driver?.phone || order.assignedDriverPhone || '',
      driverStars,
      serviceStars,
      comment,
      tags
    })
  } catch (err) {
    if (err && err.code === 11000) {
      const e = new Error('该订单已评价')
      e.code = 400
      throw e
    }
    throw err
  }

  await Order.findByIdAndUpdate(orderId, {
    $set: { ratingStatus: 'rated', updatedAt: new Date() }
  })

  await syncProfilesAfterRating(rating.toObject())

  res.status(201).json({
    code: 0,
    message: 'success',
    data: { rating: toRatingDto(rating.toObject()) }
  })
}

/** GET /api/order/:id/rating */
exports.getOrderRating = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }

  const order = await Order.findById(id).select('userId driverId assignedDriver ratingStatus status').lean()
  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  const uid = String(userIdOf(req))
  const role = req.user?.role

  if (role === 'user') {
    if (String(order.userId) !== uid) {
      const e = new Error('无权查看')
      e.code = 403
      throw e
    }
  } else if (role === 'driver') {
    const did = driverIdOf(order)
    if (!did || String(did) !== uid) {
      const e = new Error('无权查看')
      e.code = 403
      throw e
    }
  } else {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const rating = await OrderRating.findOne({ orderId: id }).lean()

  res.json({
    code: 0,
    message: 'success',
    data: {
      rating: rating ? toRatingDto(rating) : null,
      ratingStatus: order.ratingStatus || (rating ? 'rated' : 'unrated')
    }
  })
}

/** GET /api/driver/ratings */
exports.listDriverRatings = async (req, res) => {
  assertDriver(req)
  const driverId = userIdOf(req)
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

  const [items, total] = await Promise.all([
    OrderRating.find({ driverId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    OrderRating.countDocuments({ driverId })
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      ratings: items.map(toRatingDto),
      total,
      page,
      pageSize
    }
  })
}

/** Admin：按订单 ID 查评价 */
exports.getOrderRatingForAdmin = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) return null
  const rating = await OrderRating.findOne({ orderId }).lean()
  return rating ? toRatingDto(rating) : null
}
