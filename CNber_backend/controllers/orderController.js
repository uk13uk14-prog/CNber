const mongoose = require('mongoose')
const Order = require('../models/Order')
const User = require('../models/User')
const PricingRule = require('../models/PricingRule')
const PriceMatrix = require('../models/PriceMatrix')
const ORDER_STATUS = Order.ORDER_STATUS
const DISPATCH_STATUS = Order.DISPATCH_STATUS
const {
  buildQuotePatch,
  buildPaymentFields,
  paymentSummary,
  roundMoney
} = require('../utils/pricing')
const {
  fireProfileSync,
  syncProfilesAfterOrderCompleted,
  syncProfilesAfterOrderCancelled
} = require('../utils/profileSync')
const {
  canDispatchByDeposit,
  newOrderManualPaymentDefaults,
  quotedManualPaymentAmounts,
  applyReadyToStartStatus
} = require('../utils/orderPaymentFlow')
const { attachPaymentToOrder, legacyDepositStatus } = require('../utils/orderPaymentSync')
const { logPushPayload } = require('../utils/operationLog')
const { presentOrderForApi, presentOrdersForApi } = require('../utils/orderPresentation')
const { getGbpCnyRate } = require('../utils/exchangeRate')
const { buildRouteOrderQuote } = require('../utils/routePricing')
const { activeOrdersFilter } = require('../utils/orderSoftDelete')

const QUOTABLE_STATUSES = new Set([
  ORDER_STATUS.CREATED,
  ORDER_STATUS.QUOTED,
  ORDER_STATUS.PENDING
])

const DRIVER_ACCEPTED_STATUSES = new Set([
  ORDER_STATUS.DRIVER_ACCEPTED,
  ORDER_STATUS.ACCEPTED
])

const IN_PROGRESS_STATUSES = new Set([
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.STARTED
])

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
    driverPayout: roundMoney(total * 0.75),
    quoteBreakdown: {
      baseFare,
      distanceMiles,
      distanceFare,
      durationMinutes,
      timeFare,
      airportSurcharge,
      nightSurcharge,
      serviceMultiplier,
      total,
      totalPrice: total,
      driverPayout: roundMoney(total * 0.75),
      platformProfit: roundMoney(total * 0.25)
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
    driverPayout: record.driverPayout,
    quoteSource: 'matrix',
    quoteBreakdown: {
      type: 'fixed_matrix',
      airport,
      postcodePrefix: record.postcodePrefix,
      serviceType,
      matrixId: record._id,
      price: Number(record.price),
      totalPrice: Number(record.price),
      driverPayout:
        record.driverPayout != null
          ? Number(record.driverPayout)
          : roundMoney(Number(record.price) * 0.75),
      platformProfit: roundMoney(
        Number(record.price) -
          (record.driverPayout != null
            ? Number(record.driverPayout)
            : Number(record.price) * 0.75)
      )
    }
  }
}

async function calculateBestQuote(order) {
  const routeQuote = await buildRouteOrderQuote(order)
  if (routeQuote) return routeQuote

  const matrixQuote = await calculateQuoteByMatrix(order)
  if (matrixQuote) return matrixQuote

  const ruleQuote = await calculateQuoteByRule(order)
  if (!ruleQuote) return null
  return {
    ...ruleQuote,
    quoteSource: 'rule'
  }
}

const { assertScheduledPickup24h, parseScheduledAtFromBody } = require('../utils/scheduledPickup')
const driverCancellationController = require('./driverCancellationController')

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

  assertScheduledPickup24h(req.body)

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
    scheduledAt: parseScheduledAtFromBody(req.body),
    postcode: req.body.postcode,
    addressPostcode: req.body.addressPostcode,
    destinationPostcode: req.body.destinationPostcode,
    vehicleClass: String(req.body.vehicleClass || 'standard_5').trim() || 'standard_5',
    vehicleLabel: String(req.body.vehicleLabel || '5座普通').trim() || '5座普通',
    status
  }

  let order = null
  let lastCreateError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      order = await Order.create({
        ...baseOrder,
        ...(await nextOrderNoPayload()),
        ...newOrderManualPaymentDefaults()
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
      const quotePatch =
        quote.pricingMode === 'fixed' || quote.quoteSource === 'fixed' || quote.quoteSource === 'route_fixed'
          ? {
              amount: quote.amount,
              pricingMode: 'fixed',
              pricingSource: quote.pricingSource || quote.quoteSource,
              customerPriceCny: quote.customerPriceCny,
              driverPriceGbp: quote.driverPriceGbp,
              exchangeRate: quote.exchangeRate,
              driverSettlementCny: quote.driverSettlementCny,
              platformProfitCny: quote.platformProfitCny,
              priceBreakdown: quote.priceBreakdown,
              quoteBreakdown: quote.quoteBreakdown,
              driverSettlementAmount: quote.driverSettlementAmount,
              totalAmount: quote.totalAmount,
              vehicleClass: quote.vehicleClass || baseOrder.vehicleClass,
              vehicleLabel: quote.vehicleLabel || baseOrder.vehicleLabel,
              routeFromLabel: quote.routeFromLabel || '',
              routeToLabel: quote.routeToLabel || '',
              ...quotedManualPaymentAmounts(quote.amount)
            }
          : {
              ...buildQuotePatch(quote.amount, quote),
              ...quotedManualPaymentAmounts(quote.amount)
            }
      order = await Order.findByIdAndUpdate(
        order._id,
        {
          $set: {
            ...quotePatch,
            priceStatus: 'quoted',
            status: ORDER_STATUS.QUOTED,
            paymentStatus: 'unpaid',
            quoteSource: quote.quoteSource,
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
    data: { order: await presentOrderForApi(order, { withPayment: false }) }
  })
}

exports.listOrders = async (req, res) => {
  let query = { ...(req.orderQuery || {}) }
  query.$and = (query.$and || []).concat([activeOrdersFilter()])

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

  const enrichedOrders = await presentOrdersForApi(orders)

  res.json({
    code: 0,
    message: 'success',
    data: { orders: enrichedOrders }
  })
}

exports.quoteOrder = async (req, res) => {
  if (req.user.role !== 'admin') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const { orderId } = req.body || {}
  const amountCnyInput = Number(req.body.amountCny ?? req.body.customerPriceCny)
  const amountRaw = Number(req.body && req.body.amount)
  const currency = String(req.body.currency || '').toUpperCase()
  const treatAsCny = currency === 'CNY' || (Number.isFinite(amountCnyInput) && req.body.amountCny != null)
  const customerPriceCny = treatAsCny
    ? roundMoney(Number.isFinite(amountCnyInput) && amountCnyInput > 0 ? amountCnyInput : amountRaw)
    : null
  const rate = treatAsCny ? await getGbpCnyRate() : null
  const amount = treatAsCny && customerPriceCny > 0 && rate
    ? roundMoney(customerPriceCny / rate)
    : amountRaw
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
  if (!QUOTABLE_STATUSES.has(current.status)) {
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
        ...(customerPriceCny != null ? { customerPriceCny } : {}),
        ...buildQuotePatch(amount, {}),
        priceStatus: 'quoted',
        status: ORDER_STATUS.QUOTED,
        paymentStatus: current.paymentStatus || 'unpaid',
        quoteSource: 'manual',
        quoteBreakdown: {
          totalPrice: amount,
          ...(customerPriceCny != null ? { customerPriceCny } : {})
        },
        updatedAt: new Date()
      },
      $push: logPushPayload(
        req,
        'manual_quote',
        customerPriceCny != null ? `手动报价 ¥${customerPriceCny.toFixed(2)}` : `手动报价 ${amount}`
      )
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({
    code: 0,
    message: '报价成功',
    data: { order: await presentOrderForApi(order, { withPayment: false }) }
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
  if (!QUOTABLE_STATUSES.has(current.status)) {
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

  const sourceLabel =
    quote.quoteSource === 'fixed'
      ? 'V1固定报价'
      : quote.quoteSource === 'matrix'
        ? '价格表'
        : '规则'

  const quoteSet =
    quote.pricingMode === 'fixed' || quote.quoteSource === 'fixed' || quote.quoteSource === 'route_fixed'
      ? {
          amount: quote.amount,
          pricingMode: 'fixed',
          pricingSource: quote.pricingSource || quote.quoteSource,
          customerPriceCny: quote.customerPriceCny,
          driverPriceGbp: quote.driverPriceGbp,
          exchangeRate: quote.exchangeRate,
          driverSettlementCny: quote.driverSettlementCny,
          platformProfitCny: quote.platformProfitCny,
          priceBreakdown: quote.priceBreakdown,
          quoteBreakdown: quote.quoteBreakdown,
          driverSettlementAmount: quote.driverSettlementAmount,
          totalAmount: quote.totalAmount,
          vehicleClass: quote.vehicleClass,
          vehicleLabel: quote.vehicleLabel,
          routeFromLabel: quote.routeFromLabel || '',
          routeToLabel: quote.routeToLabel || '',
          ...buildPaymentFields(quote.amount)
        }
      : {
          ...buildQuotePatch(quote.amount, quote),
          quoteBreakdown: quote.quoteBreakdown
        }

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        ...quoteSet,
        priceStatus: 'quoted',
        status: ORDER_STATUS.QUOTED,
        paymentStatus: 'unpaid',
        quoteSource: quote.quoteSource,
        updatedAt: new Date()
      },
      $push: logPushPayload(
        req,
        'auto_quote',
        quote.quoteSource === 'fixed'
          ? `自动重算报价（${sourceLabel}）¥${quote.customerPriceCny}`
          : `自动重算报价（${sourceLabel}）¥${quote.customerPriceCny || quote.amount}`
      )
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({
    code: 0,
    message: '重新报价成功',
    data: { order: await presentOrderForApi(order, { withPayment: false }) }
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
        status: ORDER_STATUS.CONFIRMED,
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
    data: { order: await presentOrderForApi(order, { withPayment: false }) }
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

  if (current.paymentStatus === 'paid' && current.depositPaid && current.remainingPaid) {
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

  const summary = paymentSummary(current)
  const requestedType = String(req.body?.paymentType || '').trim()
  const paymentType =
    requestedType || (summary.depositPaid ? 'remaining' : 'deposit')
  const patch = { updatedAt: new Date() }

  if (paymentType === 'deposit') {
    if (!['unpaid', 'rejected'].includes(current.depositStatus || 'unpaid')) {
      const e = new Error('当前不可提交定金信息')
      e.code = 400
      throw e
    }
    const depAmt = roundMoney(summary.depositAmount)
    patch.depositAmount = depAmt
    patch.remainingAmount = summary.remainingAmount
    patch.balanceAmount = roundMoney(summary.balanceAmount)
    patch.depositStatus = legacyDepositStatus('pending')
    patch.paymentStage = 'deposit_submitted'
    patch.paymentStatus = 'pending'
    patch.paidAmount = depAmt
    patch['payment.depositStatus'] = 'pending'
    patch['payment.depositAmount'] = depAmt
  } else if (paymentType === 'remaining') {
    if (!canDispatchByDeposit(current)) {
      const e = new Error('定金未确认，无法提交尾款')
      e.code = 400
      throw e
    }
    if (!['unpaid', 'rejected'].includes(current.balanceStatus || 'unpaid')) {
      const e = new Error('当前不可提交尾款信息')
      e.code = 400
      throw e
    }
    const balAmt = roundMoney(summary.balanceAmount)
    patch.depositAmount = roundMoney(summary.depositAmount)
    patch.remainingAmount = summary.remainingAmount
    patch.balanceAmount = balAmt
    patch.balanceStatus = legacyDepositStatus('pending')
    patch.paymentStage = 'balance_submitted'
    patch.paymentStatus = 'pending'
    patch.paidAmount = roundMoney(summary.depositAmount)
    patch['payment.balanceStatus'] = 'pending'
    patch['payment.balanceAmount'] = balAmt
  } else if (paymentType === 'full') {
    const e = new Error('paymentType=full 已停用，请分别使用 deposit 与 remaining')
    e.code = 400
    throw e
  } else {
    const e = new Error('paymentType 必须为 deposit、remaining 或 full')
    e.code = 400
    throw e
  }

  const safePatch = applyReadyToStartStatus(current, patch)

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: safePatch
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

  if (order.isDeleted && req.user.role !== 'admin') {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  const role = req.user.role
  const uid = String(req.user.userId)

  if (role === 'driver') {
    const driverOid = order.driverId && (order.driverId._id || order.driverId)
    const driverStr = driverOid ? String(driverOid) : ''
    const inPool = [ORDER_STATUS.PENDING, ORDER_STATUS.DEPOSIT_PAID].includes(order.status)
    const mineActive =
      driverStr === uid &&
      [
        ORDER_STATUS.ASSIGNED,
        ORDER_STATUS.DRIVER_ACCEPTED,
        ORDER_STATUS.ACCEPTED,
        ORDER_STATUS.READY_TO_START,
        ORDER_STATUS.IN_PROGRESS,
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

  const presented = driverCancellationController.attachCancelMeta(await presentOrderForApi(order))
  if (role === 'driver' || role === 'user') {
    const pendingQuery = {
      orderId: order._id,
      status: 'pending'
    }
    if (role === 'driver') pendingQuery.driverId = req.user.userId
    else pendingQuery.customerId = req.user.userId
    const pending = await require('../models/DriverCancellationRequest').findOne(pendingQuery).lean()
    presented.pendingDriverCancellation = driverCancellationController.presentRequest(pending)
  }

  res.json({
    code: 0,
    message: 'success',
    data: { order: presented }
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
        assignedDriver: null,
        assignedDriverName: '',
        assignedDriverPhone: '',
        assignedAt: null,
        status: ORDER_STATUS.DEPOSIT_PAID,
        dispatchStatus: DISPATCH_STATUS.REJECTED,
        exceptionType: 'driver_rejected',
        serviceStatus: 'exception',
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
  if (!DRIVER_ACCEPTED_STATUSES.has(current.status) && current.status !== ORDER_STATUS.READY_TO_START) {
    const e = new Error('当前状态不可开始行程')
    e.code = 400
    throw e
  }
  const summary = paymentSummary(current)
  const balanceOk =
    summary.remainingPaid ||
    current.balanceStatus === 'confirmed' ||
    current.paymentStage === 'balance_confirmed'
  if (!balanceOk) {
    const e = new Error('未支付尾款，不能开始行程')
    e.code = 400
    throw e
  }

  const order = await Order.findByIdAndUpdate(
    current._id,
    { status: ORDER_STATUS.IN_PROGRESS, updatedAt: new Date() },
    { new: true }
  )
  console.log(`订单状态变化：${order._id} -> ${order.status}`)

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
  if (!IN_PROGRESS_STATUSES.has(current.status) && current.status !== ORDER_STATUS.ARRIVED) {
    const e = new Error('当前状态不可完成订单')
    e.code = 400
    throw e
  }

  const payout = roundMoney(
    current.priceBreakdown?.driverPayout ??
      current.quoteBreakdown?.driverPayout ??
      paymentSummary(current).totalPrice * 0.75
  )
  const order = await Order.findByIdAndUpdate(
    current._id,
    {
      $set: {
        status: ORDER_STATUS.COMPLETED,
        paymentStage: 'completed',
        driverSettlementStatus: 'pending',
        driverSettlementAmount: payout,
        updatedAt: new Date()
      }
    },
    { new: true }
  )
  console.log(`订单状态变化：${order._id} -> ${order.status}`)

  fireProfileSync(syncProfilesAfterOrderCompleted, order, 'completeOrder')

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.cancelOrder = driverCancellationController.cancelOrder

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

  if (
    ![
      ORDER_STATUS.CREATED,
      ORDER_STATUS.QUOTED,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.DEPOSIT_PAID,
      ORDER_STATUS.PENDING,
      ORDER_STATUS.ASSIGNED
    ].includes(current.status)
  ) {
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

  fireProfileSync(syncProfilesAfterOrderCancelled, order, 'cancelPassengerOrder')

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}
