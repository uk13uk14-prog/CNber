const mongoose = require('mongoose')
const Order = require('../models/Order')
const User = require('../models/User')
const PricingRule = require('../models/PricingRule')
const PriceMatrix = require('../models/PriceMatrix')
const ORDER_STATUS = Order.ORDER_STATUS

const AIRPORT_ALIASES = {
  LHR: 'LHR',
  LGW: 'LGW',
  MAN: 'MAN',
  LCY: 'LCY',
  LTN: 'LTN',
  STN: 'STN',
  EDI: 'EDI',
  BFS: 'BFS',
  BHD: 'BHD',
  希思罗: 'LHR',
  希思罗机场: 'LHR',
  盖特威克: 'LGW',
  盖特威克机场: 'LGW',
  曼城机场: 'MAN',
  曼彻斯特机场: 'MAN',
  伦敦城市机场: 'LCY',
  卢顿机场: 'LTN',
  斯坦斯特德机场: 'STN',
  爱丁堡机场: 'EDI',
  贝尔法斯特机场: 'BHD',
  贝尔法斯特国际机场: 'BFS'
}

function assertValidObjectId(id, message = '订单 ID 无效') {
  if (!mongoose.Types.ObjectId.isValid(String(id || ''))) {
    const e = new Error(message)
    e.code = 400
    throw e
  }
}

function assertOrderOwner(order, req) {
  const userOid = order.userId && (order.userId._id || order.userId)
  if (!userOid || String(userOid) !== String(req.user.userId)) {
    const e = new Error('无权操作该订单')
    e.code = 403
    throw e
  }
}

function formatDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

async function nextOrderNoPayload(date = new Date()) {
  const orderDateKey = formatDateKey(date)
  const latest = await Order.findOne({ orderDateKey })
    .sort({ dailySeq: -1 })
    .select('dailySeq')
    .lean()
  const dailySeq = Number(latest && latest.dailySeq ? latest.dailySeq : 0) + 1
  return {
    orderDateKey,
    dailySeq,
    orderNo: `CNB-${orderDateKey}-${String(dailySeq).padStart(3, '0')}`
  }
}

function isDuplicateKeyError(error) {
  return error && (error.code === 11000 || error.code === 11001)
}

function applyRangeFilter(query, range = '7d') {
  if (range === 'all') return
  const daysMap = { '3d': 3, '7d': 7, '14d': 14 }
  const days = daysMap[range] || 7
  const since = new Date()
  since.setDate(since.getDate() - days)
  query.createdAt = {
    ...(query.createdAt || {}),
    $gte: since
  }
}

function cleanUpper(value) {
  return String(value || '').trim().toUpperCase()
}

function firstValue(...values) {
  return values.find((value) => String(value || '').trim())
}

function detectAirportFromText(text) {
  const raw = String(text || '')
  const upper = raw.toUpperCase()
  for (const [alias, code] of Object.entries(AIRPORT_ALIASES)) {
    if (upper.includes(alias.toUpperCase()) || raw.includes(alias)) return code
  }
  return ''
}

function resolveAirport(order) {
  const explicit = firstValue(
    order.airport,
    order.pickupAirport,
    order.dropoffAirport,
    order.flightAirport
  )
  if (explicit) {
    const normalized = cleanUpper(explicit)
    return AIRPORT_ALIASES[normalized] || normalized
  }
  return detectAirportFromText(`${order.pickup || ''} ${order.destination || ''}`)
}

function extractPostcodePrefix(value) {
  const text = cleanUpper(value).replace(/[^A-Z0-9\s]/g, ' ')
  if (!text) return ''

  const outwardWithSpace = text.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s+\d[A-Z]{2}\b/)
  if (outwardWithSpace) return outwardWithSpace[1]

  const outwardLoose = text.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\b/)
  if (outwardLoose) return outwardLoose[1]

  const compact = text.replace(/\s+/g, '')
  const compactMatch = compact.match(/^([A-Z]{1,2}\d[A-Z\d]?)/)
  return compactMatch ? compactMatch[1] : ''
}

function postcodeCandidates(prefix) {
  const normalized = cleanUpper(prefix)
  if (!normalized) return []
  const candidates = [normalized]
  if (/^[A-Z]{1,2}\d[A-Z]$/.test(normalized)) {
    candidates.push(normalized.slice(0, -1))
  }
  return [...new Set(candidates)]
}

function resolvePostcodePrefix(order) {
  const explicit = firstValue(
    order.dropoffPostcode,
    order.pickupPostcode,
    order.postcode,
    order.addressPostcode,
    order.destinationPostcode
  )
  return extractPostcodePrefix(
    explicit || `${order.destination || ''} ${order.pickup || ''}`
  )
}

async function calculateQuoteByRule(order) {
  await PricingRule.ensureDefaultRules()
  const rule = await PricingRule.findOne({
    serviceType: order.serviceType || 'ride',
    enabled: true
  }).lean()
  if (!rule) return null

  const distanceMiles = 10
  const durationMinutes = 30
  const baseFare = Number(rule.baseFare || 0)
  const perMile = Number(rule.perMile || 0)
  const perMinute = Number(rule.perMinute || 0)
  const airportSurcharge = Number(rule.airportSurcharge || 0)
  const nightSurcharge = Number(rule.nightSurcharge || 0)
  const serviceMultiplier = Number(rule.serviceMultiplier || 1)
  const distanceFare = distanceMiles * perMile
  const timeFare = durationMinutes * perMinute
  const rawTotal =
    baseFare + distanceFare + timeFare + airportSurcharge + nightSurcharge
  const total = Math.round(rawTotal * serviceMultiplier * 100) / 100

  return {
    amount: total,
    quoteBreakdown: {
      baseFare,
      distanceMiles,
      distanceFare,
      durationMinutes,
      timeFare,
      airportSurcharge,
      nightSurcharge,
      serviceMultiplier,
      total
    }
  }
}

async function calculateQuoteByMatrix(order) {
  const airport = resolveAirport(order)
  const postcodePrefix = resolvePostcodePrefix(order)
  const serviceType = String(order.serviceType || 'ride').trim()
  if (!airport || !postcodePrefix || !serviceType) return null

  const record = await PriceMatrix.findOne({
    airport,
    postcodePrefix: { $in: postcodeCandidates(postcodePrefix) },
    serviceType,
    enabled: true
  }).lean()
  if (!record) return null

  return {
    amount: Number(record.price),
    quoteSource: 'matrix',
    quoteBreakdown: {
      type: 'fixed_matrix',
      airport,
      postcodePrefix: record.postcodePrefix,
      serviceType,
      matrixId: record._id,
      price: Number(record.price)
    }
  }
}

async function calculateBestQuote(order) {
  const matrixQuote = await calculateQuoteByMatrix(order)
  if (matrixQuote) return matrixQuote

  const ruleQuote = await calculateQuoteByRule(order)
  if (!ruleQuote) return null
  return {
    ...ruleQuote,
    quoteSource: 'rule'
  }
}

exports.createOrder = async (req, res) => {
  const { userId, pickup, destination, status } = req.body
  const allowedServiceTypes = new Set([
    'ride',
    'pickup',
    'dropoff',
    'charter',
    'point'
  ])
  const serviceType = allowedServiceTypes.has(req.body.serviceType)
    ? req.body.serviceType
    : 'ride'

  if (!userId || !pickup || !destination) {
    const e = new Error('字段缺失')
    e.code = 400
    throw e
  }

  const baseOrder = {
    userId,
    pickup,
    destination,
    serviceType,
    airport: req.body.airport,
    pickupAirport: req.body.pickupAirport,
    dropoffAirport: req.body.dropoffAirport,
    flightAirport: req.body.flightAirport,
    pickupPostcode: req.body.pickupPostcode,
    dropoffPostcode: req.body.dropoffPostcode,
    pickupDetail: req.body.pickupDetail,
    dropoffDetail: req.body.dropoffDetail,
    postcode: req.body.postcode,
    addressPostcode: req.body.addressPostcode,
    destinationPostcode: req.body.destinationPostcode,
    status
  }

  let order = null
  let lastCreateError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      order = await Order.create({
        ...baseOrder,
        ...(await nextOrderNoPayload())
      })
      break
    } catch (e) {
      lastCreateError = e
      if (!isDuplicateKeyError(e)) throw e
    }
  }
  if (!order) throw lastCreateError

  try {
    const quote = await calculateBestQuote(order)
    if (quote) {
      order = await Order.findByIdAndUpdate(
        order._id,
        {
          $set: {
            amount: quote.amount,
            priceStatus: 'quoted',
            paymentStatus: 'unpaid',
            quoteSource: quote.quoteSource,
            quoteBreakdown: quote.quoteBreakdown,
            updatedAt: new Date()
          }
        },
        { new: true }
      )
    }
  } catch (e) {
    console.warn('[order:auto-quote] failed after createOrder', {
      orderId: order._id,
      message: e.message
    })
  }

  res.status(201).json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.listOrders = async (req, res) => {
  let query = { ...(req.orderQuery || {}) }

  if (req.user.role === 'driver') {
    // 后台派单模式：司机端列表只返回明确指派给自己的订单。
    query = { driverId: req.user.userId }
  }

  // 管理端：筛选扩展（供 CNber_admin_console 使用）
  if (req.user.role === 'admin') {
    const {
      status,
      serviceType,
      orderId,
      dateFrom,
      dateTo,
      customerPhone,
      paymentStatus,
      range = '7d'
    } = req.query
    if (status && typeof status === 'string') {
      query.status = status
    }
    if (serviceType && typeof serviceType === 'string') {
      query.serviceType = serviceType
    }
    if (paymentStatus && typeof paymentStatus === 'string') {
      query.paymentStatus = paymentStatus
    }
    if (orderId && mongoose.Types.ObjectId.isValid(String(orderId))) {
      query._id = orderId
    }
    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom)
      }
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        query.createdAt.$lte = end
      }
    }
    if (!dateFrom && !dateTo) {
      applyRangeFilter(query, range)
    }
    if (customerPhone && String(customerPhone).trim()) {
      const phones = await User.find({
        phone: new RegExp(String(customerPhone).trim(), 'i')
      })
        .select('_id')
        .lean()
      query.userId = { $in: phones.map((u) => u._id) }
    }
  }

  const orders = await Order.find(query)
    .sort({ createdAt: -1, dailySeq: -1 })
    .populate('userId', 'phone')
    .populate('driverId', 'phone')

  res.json({
    code: 0,
    message: 'success',
    data: { orders }
  })
}

exports.quoteOrder = async (req, res) => {
  if (req.user.role !== 'admin') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const { orderId } = req.body || {}
  const amount = Number(req.body && req.body.amount)
  assertValidObjectId(orderId)
  if (!Number.isFinite(amount) || amount <= 0) {
    const e = new Error('报价金额必须大于 0')
    e.code = 400
    throw e
  }

  const current = await Order.findById(orderId)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  if (current.status !== ORDER_STATUS.PENDING) {
    const e = new Error('当前状态不可报价')
    e.code = 400
    throw e
  }
  if (current.priceStatus === 'confirmed' || current.paymentStatus !== 'unpaid') {
    const e = new Error('客户已确认或已支付，禁止改价')
    e.code = 400
    throw e
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        amount,
        priceStatus: 'quoted',
        paymentStatus: current.paymentStatus || 'unpaid',
        quoteSource: 'manual',
        quoteBreakdown: {},
        updatedAt: new Date()
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({
    code: 0,
    message: '报价成功',
    data: { order }
  })
}

exports.autoQuoteOrder = async (req, res) => {
  if (req.user.role !== 'admin') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const { orderId } = req.body || {}
  assertValidObjectId(orderId)

  const current = await Order.findById(orderId)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  if (current.status !== ORDER_STATUS.PENDING) {
    const e = new Error('当前状态不可报价')
    e.code = 400
    throw e
  }
  if (current.priceStatus === 'confirmed' || current.paymentStatus !== 'unpaid') {
    const e = new Error('客户已确认或已支付，禁止重算报价')
    e.code = 400
    throw e
  }

  const quote = await calculateBestQuote(current)
  if (!quote) {
    const e = new Error('未找到可用报价')
    e.code = 400
    throw e
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        amount: quote.amount,
        priceStatus: 'quoted',
        paymentStatus: 'unpaid',
        quoteSource: quote.quoteSource,
        quoteBreakdown: quote.quoteBreakdown,
        updatedAt: new Date()
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({
    code: 0,
    message: '重新报价成功',
    data: { order }
  })
}

exports.confirmPrice = async (req, res) => {
  const { orderId } = req.body || {}
  assertValidObjectId(orderId)

  const current = await Order.findById(orderId)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  assertOrderOwner(current, req)

  if (current.status === ORDER_STATUS.COMPLETED) {
    const e = new Error('订单已完成，禁止操作')
    e.code = 400
    throw e
  }
  if (current.priceStatus !== 'quoted') {
    const e = new Error('当前状态不可确认价格')
    e.code = 400
    throw e
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        priceStatus: 'confirmed',
        paymentStatus: 'pending',
        updatedAt: new Date()
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({
    code: 0,
    message: '价格已确认',
    data: { order }
  })
}

exports.payOrder = async (req, res) => {
  const { orderId } = req.body || {}
  assertValidObjectId(orderId)

  const current = await Order.findById(orderId)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  assertOrderOwner(current, req)

  if (current.paymentStatus === 'paid') {
    const order = await current.populate([
      { path: 'userId', select: 'phone role' },
      { path: 'driverId', select: 'phone role' }
    ])
    return res.json({
      code: 0,
      message: '已支付（重复请求已忽略）',
      data: { order }
    })
  }

  if (current.priceStatus !== 'confirmed') {
    const e = new Error('请先确认价格')
    e.code = 400
    throw e
  }
  if (!Number.isFinite(Number(current.amount)) || Number(current.amount) <= 0) {
    const e = new Error('订单金额无效')
    e.code = 400
    throw e
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        paymentStatus: 'paid',
        updatedAt: new Date()
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({
    code: 0,
    message: '支付成功（模拟）',
    data: { order }
  })
}

/**
 * 司机/乘客查看单条订单（司机：待接单池任意单 + 指派/已接本人单；乘客：本人单）
 */
exports.getOrderById = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }

  const order = await Order.findById(id)
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .lean()

  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  const role = req.user.role
  const uid = String(req.user.userId)

  if (role === 'driver') {
    const driverOid = order.driverId && (order.driverId._id || order.driverId)
    const driverStr = driverOid ? String(driverOid) : ''
    const inPool = order.status === ORDER_STATUS.PENDING
    const mineActive =
      driverStr === uid &&
      [
        ORDER_STATUS.ASSIGNED,
        ORDER_STATUS.ACCEPTED,
        ORDER_STATUS.STARTED
      ].includes(order.status)
    if (!inPool && !mineActive) {
      const e = new Error('无权查看该订单')
      e.code = 403
      throw e
    }
  } else if (role === 'user') {
    const userOid = order.userId && (order.userId._id || order.userId)
    if (!userOid || String(userOid) !== uid) {
      const e = new Error('无权查看该订单')
      e.code = 403
      throw e
    }
  } else {
    const e = new Error('请使用管理端或乘客端接口')
    e.code = 403
    throw e
  }

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.rejectOrder = async (req, res) => {
  if (req.user.role !== 'driver') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const { orderId } = req.body
  if (!orderId) {
    const e = new Error('缺少 orderId')
    e.code = 400
    throw e
  }

  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      driverId: req.user.userId,
      status: ORDER_STATUS.ASSIGNED
    },
    {
      $set: {
        driverId: null,
        status: ORDER_STATUS.PENDING,
        updatedAt: new Date()
      }
    },
    { new: true }
  )

  if (!order) {
    const e = new Error('仅指派给你的待确认订单可拒单')
    e.code = 400
    throw e
  }

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.startOrder = async (req, res) => {
  if (req.user.role !== 'driver') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const { orderId } = req.body
  if (!orderId) {
    const e = new Error('缺少 orderId')
    e.code = 400
    throw e
  }

  assertValidObjectId(orderId)
  const current = await Order.findOne({
    _id: orderId,
    driverId: req.user.userId
  })

  if (!current) {
    const e = new Error('订单不存在或无权操作')
    e.code = 400
    throw e
  }
  if (current.status !== ORDER_STATUS.ACCEPTED) {
    const e = new Error('当前状态不可开始行程')
    e.code = 400
    throw e
  }
  if (current.paymentStatus !== 'paid') {
    const e = new Error('用户未支付，不能开始行程')
    e.code = 400
    throw e
  }

  const order = await Order.findByIdAndUpdate(
    current._id,
    { status: ORDER_STATUS.STARTED, updatedAt: new Date() },
    { new: true }
  )

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.completeOrder = async (req, res) => {
  if (req.user.role !== 'driver') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const { orderId } = req.body
  if (!orderId) {
    const e = new Error('缺少 orderId')
    e.code = 400
    throw e
  }

  assertValidObjectId(orderId)
  const current = await Order.findOne({
    _id: orderId,
    driverId: req.user.userId
  })

  if (!current) {
    const e = new Error('订单不存在或无权操作')
    e.code = 400
    throw e
  }
  if (current.status !== ORDER_STATUS.STARTED) {
    const e = new Error('当前状态不可完成订单')
    e.code = 400
    throw e
  }

  const order = await Order.findByIdAndUpdate(
    current._id,
    { status: ORDER_STATUS.COMPLETED, updatedAt: new Date() },
    { new: true }
  )

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.cancelOrder = async (req, res) => {
  if (req.user.role !== 'driver') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const { orderId } = req.body
  if (!orderId) {
    const e = new Error('缺少 orderId')
    e.code = 400
    throw e
  }

  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      driverId: req.user.userId,
      status: { $in: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.STARTED] }
    },
    {
      $set: {
        status: ORDER_STATUS.CANCELLED,
        updatedAt: new Date()
      }
    },
    { new: true }
  )

  if (!order) {
    const e = new Error('仅已接单或行程中订单可取消')
    e.code = 400
    throw e
  }

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.cancelPassengerOrder = async (req, res) => {
  if (req.user.role !== 'user') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const { orderId } = req.body || {}
  assertValidObjectId(orderId)

  const current = await Order.findById(orderId)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  assertOrderOwner(current, req)

  if (![ORDER_STATUS.PENDING, ORDER_STATUS.ASSIGNED].includes(current.status)) {
    const e = new Error('仅待接单或已指派订单可由乘客取消')
    e.code = 400
    throw e
  }

  const order = await Order.findByIdAndUpdate(
    current._id,
    { status: ORDER_STATUS.CANCELLED, updatedAt: new Date() },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}
