const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Driver = require('../models/Driver')
const Order = require('../models/Order')
const { presentOrdersForApi } = require('../utils/orderPresentation')
const User = require('../models/User')
const Withdrawal = require('../models/Withdrawal')
const DriverSettlement = require('../models/DriverSettlement')
const ORDER_STATUS = Order.ORDER_STATUS
const WITHDRAWAL_STATUS = Withdrawal.WITHDRAWAL_STATUS
const DISPATCH_STATUS = Order.DISPATCH_STATUS
const { getGbpCnyRate, gbpToCny } = require('../utils/exchangeRate')
const { roundMoney } = require('../utils/pricing')
const {
  driverIncomeGbpAggregationExpr,
  buildDriverOrderMatch,
  resolveDriverIncomeGbp
} = require('../utils/driverIncome')
const { formatDateOnlyUTC } = require('../utils/driverSettlementPeriod')

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek() {
  const d = startOfToday()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d
}

function startOfMonth() {
  const d = startOfToday()
  d.setDate(1)
  return d
}

function toDriverObjectId(req) {
  return new mongoose.Types.ObjectId(String(req.user.userId))
}

function assertDriver(req) {
  if (!req.user || req.user.role !== 'driver') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }
}

function normalizeDate(value) {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function formatProfile(user) {
  const profile = user?.driverProfile || {}
  const payment = profile.payment || {}
  const vehicle = profile.vehicle || {}
  const documents = profile.documents || {}

  return {
    personal: {
      realName: profile.realName || '',
      phone: profile.phone || user?.phone || '',
      email: profile.email || '',
      address: profile.address || '',
      status: profile.status || 'offline',
      lastActiveAt: profile.lastActiveAt || null
    },
    license: {
      licenseNo: profile.licenseNo || profile.licenseNumber || '',
      licenseNumber: profile.licenseNumber || profile.licenseNo || '',
      licenseExpireAt: profile.licenseExpireAt || null,
      insuranceValidUntil: profile.insuranceValidUntil || null,
      motValidUntil: profile.motValidUntil || null,
      pcoLicenseNumber: profile.pcoLicenseNumber || ''
    },
    payment: {
      defaultMethod: payment.defaultMethod || 'alipay',
      alipayName: payment.alipayName || '',
      alipayAccount: payment.alipayAccount || '',
      wechatName: payment.wechatName || '',
      wechatAccount: payment.wechatAccount || ''
    },
    vehicle: {
      plateNo: vehicle.plateNo || profile.vehiclePlate || '',
      model: vehicle.model || profile.vehicleModel || '',
      vehiclePlate: profile.vehiclePlate || vehicle.plateNo || '',
      vehicleModel: profile.vehicleModel || vehicle.model || '',
      vehiclePhoto: profile.vehiclePhoto || vehicle.vehiclePhoto || '',
      seats: vehicle.seats || '',
      motExpireAt: vehicle.motExpireAt || null,
      insuranceExpireAt: vehicle.insuranceExpireAt || null
    },
    documents: {
      licenseImage: documents.licenseImage || '',
      insuranceImage: documents.insuranceImage || '',
      motImage: documents.motImage || '',
      reviewStatus: documents.reviewStatus || 'pending',
      reviewRemark: documents.reviewRemark || ''
    },
    approvalStatus:
      profile.approvalStatus || documents.reviewStatus || 'pending'
  }
}

function profileCompletionFromUser(user) {
  const profile = user?.driverProfile || {}
  const payment = profile.payment || {}
  const vehicle = profile.vehicle || {}
  const documents = profile.documents || {}
  const defaultMethod = payment.defaultMethod || 'alipay'

  return {
    personal: Boolean(profile.realName && (profile.phone || user?.phone) && profile.email),
    payment:
      defaultMethod === 'wechat'
        ? Boolean(payment.wechatAccount)
        : Boolean(payment.alipayAccount),
    vehicle: Boolean(
      (vehicle.plateNo || profile.vehiclePlate) &&
        (vehicle.model || profile.vehicleModel) &&
        vehicle.motExpireAt &&
        vehicle.insuranceExpireAt
    ),
    documents: Boolean(documents.licenseImage && documents.insuranceImage && documents.motImage)
  }
}

function buildProfileUpdate(body = {}) {
  const set = {}
  const simpleFields = [
    'realName',
    'phone',
    'email',
    'address',
    'licenseNo',
    'licenseNumber',
    'vehiclePhoto',
    'vehiclePlate',
    'vehicleModel',
    'pcoLicenseNumber'
  ]

  simpleFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      set[`driverProfile.${field}`] = String(body[field] || '').trim()
    }
  })

  if (Object.prototype.hasOwnProperty.call(body, 'licenseExpireAt')) {
    set['driverProfile.licenseExpireAt'] = normalizeDate(body.licenseExpireAt) || null
  }
  ;['insuranceValidUntil', 'motValidUntil'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      set[`driverProfile.${field}`] = normalizeDate(body[field]) || null
    }
  })

  const payment = body.payment || {}
  if (Object.prototype.hasOwnProperty.call(payment, 'defaultMethod')) {
    const method = String(payment.defaultMethod || '').trim()
    if (['alipay', 'wechat'].includes(method)) {
      set['driverProfile.payment.defaultMethod'] = method
    }
  }
  ;['alipayName', 'alipayAccount', 'wechatName', 'wechatAccount'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payment, field)) {
      set[`driverProfile.payment.${field}`] = String(payment[field] || '').trim()
    }
  })

  const vehicle = body.vehicle || {}
  ;['plateNo', 'model', 'vehiclePlate', 'vehicleModel', 'vehiclePhoto'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(vehicle, field)) {
      set[`driverProfile.vehicle.${field}`] = String(vehicle[field] || '').trim()
    }
  })
  if (Object.prototype.hasOwnProperty.call(vehicle, 'seats')) {
    const seats = Number(vehicle.seats)
    set['driverProfile.vehicle.seats'] = Number.isFinite(seats) ? seats : null
  }
  if (Object.prototype.hasOwnProperty.call(vehicle, 'motExpireAt')) {
    set['driverProfile.vehicle.motExpireAt'] = normalizeDate(vehicle.motExpireAt) || null
  }
  if (Object.prototype.hasOwnProperty.call(vehicle, 'insuranceExpireAt')) {
    set['driverProfile.vehicle.insuranceExpireAt'] = normalizeDate(vehicle.insuranceExpireAt) || null
  }

  const documents = body.documents || {}
  ;['licenseImage', 'insuranceImage', 'motImage'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(documents, field)) {
      set[`driverProfile.documents.${field}`] = String(documents[field] || '').trim()
    }
  })

  return set
}

function buildAccountUpdate(body = {}) {
  const set = {}
  const phone = String(body.phone || '').trim()
  const email = String(body.email || '').trim()

  if (phone) {
    set.phone = phone
    set['driverProfile.phone'] = phone
  }
  if (email) {
    set['driverProfile.email'] = email
  }

  return set
}

async function sumCompletedIncome(driverId, since = null) {
  const match = buildDriverOrderMatch(driverId, since)

  const result = await Order.aggregate([
    { $match: match },
    { $addFields: { driverIncomeGbp: driverIncomeGbpAggregationExpr() } },
    {
      $group: {
        _id: null,
        income: { $sum: '$driverIncomeGbp' },
        orders: { $sum: 1 }
      }
    }
  ])

  const row = result[0] || { income: 0, orders: 0 }
  return {
    income: roundMoney(row.income || 0),
    orders: row.orders || 0
  }
}

async function sumDriverSettlements(driverId, status) {
  const match = { driverId }
  if (status) match.status = status

  const result = await DriverSettlement.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        gbp: { $sum: { $ifNull: ['$driverSettlementGbp', 0] } },
        cny: { $sum: { $ifNull: ['$payableCny', 0] } },
        count: { $sum: 1 }
      }
    }
  ])

  const row = result[0] || {}
  return {
    gbp: roundMoney(row.gbp || 0),
    cny: roundMoney(row.cny || 0),
    count: row.count || 0
  }
}

function orderDisplayNo(order) {
  if (order?.orderNo) return String(order.orderNo)
  if (order?.orderDateKey && order?.dailySeq != null) {
    return `${order.orderDateKey}-${String(order.dailySeq).padStart(3, '0')}`
  }
  const id = order?._id ? String(order._id) : ''
  return id.length > 8 ? id.slice(-8) : id || '—'
}

async function sumWithdrawnAmount(driverId) {
  const result = await Withdrawal.aggregate([
    {
      $match: {
        driverId,
        status: {
          $in: [WITHDRAWAL_STATUS.PENDING, WITHDRAWAL_STATUS.APPROVED]
        }
      }
    },
    {
      $group: {
        _id: null,
        amount: { $sum: { $ifNull: ['$amount', 0] } }
      }
    }
  ])

  return result[0]?.amount || 0
}

exports.getDashboard = async (req, res) => {
  assertDriver(req)
  const driverId = toDriverObjectId(req)
  const now = new Date()
  const next14Days = new Date(now)
  next14Days.setDate(next14Days.getDate() + 14)

  const [user, today, week, total, pendingOrdersCount, ongoingOrdersCount, nextOrders] =
    await Promise.all([
      User.findById(req.user.userId).select('phone role driverProfile').lean(),
      sumCompletedIncome(driverId, startOfToday()),
      sumCompletedIncome(driverId, startOfWeek()),
      sumCompletedIncome(driverId),
      Order.countDocuments({
        driverId,
        status: {
          $in: [
            ORDER_STATUS.ASSIGNED,
            ORDER_STATUS.PENDING,
            ORDER_STATUS.DEPOSIT_PAID
          ]
        }
      }),
      Order.countDocuments({
        driverId,
        status: {
          $in: [
            ORDER_STATUS.ACCEPTED,
            ORDER_STATUS.DRIVER_ACCEPTED,
            ORDER_STATUS.STARTED,
            ORDER_STATUS.IN_PROGRESS
          ]
        }
      }),
      Order.find({
        driverId,
        status: {
          $in: [
            ORDER_STATUS.ASSIGNED,
            ORDER_STATUS.ACCEPTED,
            ORDER_STATUS.DRIVER_ACCEPTED,
            ORDER_STATUS.READY_TO_START,
            ORDER_STATUS.STARTED,
            ORDER_STATUS.IN_PROGRESS
          ]
        },
        createdAt: { $lte: next14Days }
      })
        .sort({ createdAt: 1 })
        .limit(20)
        .select('_id orderNo pickup destination createdAt status')
        .lean()
    ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      status: user?.driverProfile?.status || 'offline',
      driverName: user?.driverProfile?.realName || user?.phone || '司机',
      todayIncome: today.income || 0,
      weekIncome: week.income || 0,
      totalIncome: total.income || 0,
      pendingOrdersCount,
      ongoingOrdersCount,
      next14DaysOrders: nextOrders.map((order) => ({
        _id: order._id,
        orderNo: order.orderNo || '',
        pickupAddress: order.pickup || '',
        dropoffAddress: order.destination || '',
        scheduledTime: order.createdAt || null,
        status: order.status
      })),
      profileCompletion: profileCompletionFromUser(user),
      documentsCompletion: profileCompletionFromUser(user).documents
    }
  })
}

exports.updateAccount = async (req, res) => {
  assertDriver(req)
  const body = req.body || {}
  const set = buildAccountUpdate(body)
  const newPassword = String(body.newPassword || '')

  if (set.phone) {
    const existing = await User.findOne({
      phone: set.phone,
      _id: { $ne: req.user.userId }
    })
      .select('_id')
      .lean()
    if (existing) {
      const e = new Error('手机号已被使用')
      e.code = 409
      throw e
    }
  }

  if (newPassword) {
    const oldPassword = String(body.oldPassword || '')
    if (!oldPassword) {
      const e = new Error('请输入旧密码')
      e.code = 400
      throw e
    }

    const current = await User.findById(req.user.userId).select('+password')
    const matched = await bcrypt.compare(oldPassword, current?.password || '')
    if (!matched) {
      const e = new Error('旧密码不正确')
      e.code = 400
      throw e
    }

    set.password = await bcrypt.hash(newPassword, 10)
  }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { $set: set },
    { new: true, runValidators: true }
  )
    .select('phone role driverProfile')
    .lean()

  if (!user) {
    const e = new Error('司机不存在')
    e.code = 404
    throw e
  }

  res.json({
    code: 0,
    message: 'success',
    data: {
      phone: user.phone || '',
      email: user.driverProfile?.email || ''
    }
  })
}

exports.updateStatus = async (req, res) => {
  assertDriver(req)
  const status = String(req.body?.status || '').trim()
  if (!['online', 'offline'].includes(status)) {
    const e = new Error('司机状态无效')
    e.code = 400
    throw e
  }

  const isOnline = status === 'online'
  const now = new Date()

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    {
      $set: {
        'driverProfile.status': status,
        'driverProfile.lastActiveAt': now
      }
    },
    { new: true }
  )
    .select('driverProfile')
    .lean()

  await Driver.findOneAndUpdate(
    { userId: req.user.userId },
    {
      $set: {
        available: isOnline,
        serviceStatus: isOnline ? 'idle' : 'offline',
        updatedAt: now
      }
    }
  )

  res.json({
    code: 0,
    message: 'success',
    data: {
      status: user?.driverProfile?.status || status,
      available: isOnline,
      serviceStatus: isOnline ? 'idle' : 'offline',
      lastActiveAt: user?.driverProfile?.lastActiveAt || null
    }
  })
}

exports.getProfile = async (req, res) => {
  assertDriver(req)
  const user = await User.findById(req.user.userId)
    .select('phone role driverProfile')
    .lean()

  if (!user) {
    const e = new Error('司机不存在')
    e.code = 404
    throw e
  }

  res.json({
    code: 0,
    message: 'success',
    data: formatProfile(user)
  })
}

exports.updateProfile = async (req, res) => {
  assertDriver(req)
  const set = buildProfileUpdate(req.body || {})

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { $set: set },
    { new: true, runValidators: true }
  )
    .select('phone role driverProfile')
    .lean()

  if (!user) {
    const e = new Error('司机不存在')
    e.code = 404
    throw e
  }

  res.json({
    code: 0,
    message: 'success',
    data: formatProfile(user)
  })
}

exports.getDriverList = async (req, res) => {
  const page = Number(req.query.page || 1)
  const pageSize = Number(req.query.pageSize || 10)
  const status = req.query.status || ''
  const query = status ? { status } : {}

  const drivers = await Driver.find(query)
    .populate('userId', 'phone')
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)

  const total = await Driver.countDocuments(query)
  res.json({
    code: 0,
    message: 'success',
    data: { drivers, total, page, pageSize }
  })
}

exports.approveDriver = async (req, res) => {
  const driver = await Driver.findByIdAndUpdate(
    req.params.id,
    { status: 'approved' },
    { new: true }
  )
  res.json({
    code: 0,
    message: 'success',
    data: { driver }
  })
}

exports.rejectDriver = async (req, res) => {
  const driver = await Driver.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected' },
    { new: true }
  )
  res.json({
    code: 0,
    message: 'success',
    data: { driver }
  })
}

exports.banDriver = async (req, res) => {
  const driver = await Driver.findByIdAndUpdate(
    req.params.id,
    { status: 'banned' },
    { new: true }
  )
  res.json({
    code: 0,
    message: 'success',
    data: { driver }
  })
}

exports.getIncomeSummary = async (req, res) => {
  assertDriver(req)
  const driverId = toDriverObjectId(req)

  const [
    today,
    week,
    month,
    total,
    withdrawnAmount,
    pendingSettlements,
    paidSettlements,
    exchangeRate
  ] = await Promise.all([
    sumCompletedIncome(driverId, startOfToday()),
    sumCompletedIncome(driverId, startOfWeek()),
    sumCompletedIncome(driverId, startOfMonth()),
    sumCompletedIncome(driverId),
    sumWithdrawnAmount(driverId),
    sumDriverSettlements(driverId, 'pending'),
    sumDriverSettlements(driverId, 'paid'),
    getGbpCnyRate()
  ])

  const availableBalance = Math.max(0, pendingSettlements.gbp)

  res.json({
    code: 0,
    message: 'success',
    data: {
      todayIncomeGbp: today.income,
      weekIncomeGbp: week.income,
      monthIncomeGbp: month.income,
      totalIncomeGbp: total.income,
      pendingSettlementGbp: pendingSettlements.gbp,
      paidSettlementGbp: paidSettlements.gbp,
      pendingSettlementCny: pendingSettlements.cny,
      paidSettlementCny: paidSettlements.cny,
      exchangeRate,
      completedOrderCount: total.orders,
      pendingSettlementCount: pendingSettlements.count,
      paidSettlementCount: paidSettlements.count,
      // 兼容旧字段
      todayIncome: today.income,
      weekIncome: week.income,
      monthIncome: month.income,
      totalIncome: total.income,
      withdrawnAmount,
      availableBalance,
      totalOrders: total.orders,
      totalCompletedOrders: total.orders
    }
  })
}

/** GET /api/driver/settlements — 当前司机结算批次 */
exports.listDriverSettlements = async (req, res) => {
  assertDriver(req)
  const driverId = toDriverObjectId(req)
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const status = String(req.query.status || '').trim()

  const query = { driverId }
  if (status === 'pending' || status === 'paid') {
    query.status = status
  }

  const [items, total] = await Promise.all([
    DriverSettlement.find(query)
      .sort({ startDate: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    DriverSettlement.countDocuments(query)
  ])

  const allOrderIds = [...new Set(items.flatMap((row) => (row.orderIds || []).map(String)))]
  const orderDocs = allOrderIds.length
    ? await Order.find({ _id: { $in: allOrderIds } })
        .select(
          '_id orderNo orderDateKey dailySeq pickup destination driverPriceGbp driverSettlementGbp driverAmount driverSettlementAmount priceBreakdown quoteBreakdown updatedAt'
        )
        .lean()
    : []
  const orderMap = new Map(orderDocs.map((o) => [String(o._id), o]))

  const settlements = items.map((row) => {
    const orders = (row.orderIds || [])
      .map((id) => orderMap.get(String(id)))
      .filter(Boolean)
      .map((o) => ({
        _id: o._id,
        orderNo: orderDisplayNo(o),
        pickup: o.pickup || '',
        destination: o.destination || '',
        driverSettlementGbp: resolveDriverIncomeGbp(o),
        completedAt: o.updatedAt || null
      }))

    return {
      _id: row._id,
      periodLabel: row.periodLabel || '',
      startDate: row.startDate ? formatDateOnlyUTC(row.startDate) : '',
      endDate: row.endDate ? formatDateOnlyUTC(row.endDate) : '',
      orderCount: row.orderCount ?? orders.length,
      driverSettlementGbp: roundMoney(row.driverSettlementGbp || 0),
      exchangeRate: row.exchangeRate ?? null,
      payableCny: roundMoney(row.payableCny || 0),
      status: row.status,
      paidAt: row.paidAt || null,
      paymentMethod: row.paymentMethod || null,
      paymentReference: row.paymentReference || '',
      paymentProofUrl: row.paymentProofUrl || '',
      paymentRemark: row.paymentRemark || '',
      orders
    }
  })

  res.json({
    code: 0,
    message: 'success',
    data: {
      settlements,
      total,
      page,
      pageSize
    }
  })
}

/** GET /api/driver/settlement-payments — 当前司机已结算打款记录 */
exports.listDriverSettlementPayments = async (req, res) => {
  assertDriver(req)
  const driverId = toDriverObjectId(req)
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

  const query = { driverId, status: 'paid' }

  const [items, total] = await Promise.all([
    DriverSettlement.find(query)
      .sort({ paidAt: -1, startDate: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    DriverSettlement.countDocuments(query)
  ])

  const payments = items.map((row) => ({
    _id: row._id,
    periodLabel: row.periodLabel || '',
    orderCount: row.orderCount ?? 0,
    driverSettlementGbp: roundMoney(row.driverSettlementGbp || 0),
    payableCny: roundMoney(row.payableCny || 0),
    exchangeRate: row.exchangeRate ?? null,
    paidAt: row.paidAt || null,
    paymentMethod: row.paymentMethod || null,
    paymentReference: row.paymentReference || '',
    paymentProofUrl: row.paymentProofUrl || '',
    paymentRemark: row.paymentRemark || ''
  }))

  res.json({
    code: 0,
    message: 'success',
    data: {
      payments,
      total,
      page,
      pageSize
    }
  })
}

exports.listDriverOrders = async (req, res) => {
  const scope = String(req.query.scope || '').trim()
  if (scope !== 'history') {
    assertDriver(req)
    const driverId = req.user.userId
    const orders = await Order.find({
      $or: [{ driverId }, { assignedDriver: driverId }],
      status: {
        $in: [
          ORDER_STATUS.ASSIGNED,
          ORDER_STATUS.ACCEPTED,
          ORDER_STATUS.DRIVER_ACCEPTED,
          ORDER_STATUS.READY_TO_START,
          ORDER_STATUS.STARTED,
          ORDER_STATUS.IN_PROGRESS,
          ORDER_STATUS.ARRIVED,
          ORDER_STATUS.COMPLETED
        ]
      }
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate('userId', 'phone role')
      .populate('driverId', 'phone role')
      .populate('assignedDriver', 'phone role driverProfile')
      .lean()

    const enriched = await presentOrdersForApi(orders)

    return res.json({
      code: 0,
      message: 'success',
      data: { orders: enriched }
    })
  }

  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)))
  const query = {
    driverId: req.user.userId,
    status: ORDER_STATUS.COMPLETED,
    paymentStatus: 'paid',
    amount: { $gt: 0 }
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('userId', 'phone role')
      .populate('driverId', 'phone role')
      .lean(),
    Order.countDocuments(query)
  ])

  res.json({
    code: 0,
    message: 'success',
    data: { orders, total, page, pageSize }
  })
}

exports.acceptAssignedOrder = async (req, res) => {
  assertDriver(req)
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }

  const order = await Order.findOneAndUpdate(
    {
      _id: id,
      assignedDriver: req.user.userId,
      dispatchStatus: DISPATCH_STATUS.ASSIGNED
    },
    {
      $set: {
        driverId: req.user.userId,
        dispatchStatus: DISPATCH_STATUS.ACCEPTED,
        status: ORDER_STATUS.DRIVER_ACCEPTED,
        updatedAt: new Date()
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')

  if (!order) {
    const e = new Error('订单不存在或未派给当前司机')
    e.code = 400
    throw e
  }

  console.log(`订单状态变化：${order._id} -> ${order.status}`)

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.rejectAssignedOrder = async (req, res) => {
  assertDriver(req)
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }

  const current = await Order.findOne({
    _id: id,
    assignedDriver: req.user.userId,
    dispatchStatus: DISPATCH_STATUS.ASSIGNED
  })
  if (!current) {
    const e = new Error('订单不存在或未派给当前司机')
    e.code = 400
    throw e
  }

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: {
        driverId: null,
        assignedDriver: null,
        assignedDriverName: '',
        assignedDriverPhone: '',
        assignedAt: null,
        dispatchStatus: DISPATCH_STATUS.REJECTED,
        status:
          current.status === ORDER_STATUS.ASSIGNED
            ? ORDER_STATUS.DEPOSIT_PAID
            : current.status,
        updatedAt: new Date()
      }
    },
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

exports.createWithdrawal = async (req, res) => {
  const amount = Number(req.body && req.body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    const e = new Error('提现金额必须大于 0')
    e.code = 400
    throw e
  }

  const driverId = toDriverObjectId(req)
  const [total, withdrawnAmount] = await Promise.all([
    sumCompletedIncome(driverId),
    sumWithdrawnAmount(driverId)
  ])
  const availableBalance = Math.max(0, total.income - withdrawnAmount)

  if (amount > availableBalance) {
    return res.status(400).json({
      code: 400,
      message: '余额不足',
      data: {
        balance: availableBalance,
        totalIncome: total.income,
        withdrawnAmount,
        availableBalance
      }
    })
  }

  const withdrawal = await Withdrawal.create({
    driverId,
    amount,
    status: WITHDRAWAL_STATUS.PENDING
  })

  res.json({
    code: 0,
    message: '提现申请已提交',
    data: {
      withdrawal,
      balance: availableBalance - amount,
      totalIncome: total.income,
      withdrawnAmount: withdrawnAmount + amount,
      availableBalance: availableBalance - amount
    }
  })
}

exports.listWithdrawals = async (req, res) => {
  const withdrawals = await Withdrawal.find({ driverId: req.user.userId })
    .sort({ createdAt: -1 })
    .lean()

  res.json({
    code: 0,
    message: 'success',
    data: { withdrawals }
  })
}
