const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Driver = require('../models/Driver')
const Order = require('../models/Order')
const User = require('../models/User')
const Withdrawal = require('../models/Withdrawal')
const ORDER_STATUS = Order.ORDER_STATUS
const WITHDRAWAL_STATUS = Withdrawal.WITHDRAWAL_STATUS
const DISPATCH_STATUS = Order.DISPATCH_STATUS

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
      licenseNo: profile.licenseNo || '',
      licenseExpireAt: profile.licenseExpireAt || null
    },
    payment: {
      defaultMethod: payment.defaultMethod || 'alipay',
      alipayName: payment.alipayName || '',
      alipayAccount: payment.alipayAccount || '',
      wechatName: payment.wechatName || '',
      wechatAccount: payment.wechatAccount || ''
    },
    vehicle: {
      plateNo: vehicle.plateNo || '',
      model: vehicle.model || '',
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
    }
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
      vehicle.plateNo &&
        vehicle.model &&
        vehicle.motExpireAt &&
        vehicle.insuranceExpireAt
    ),
    documents: Boolean(documents.licenseImage && documents.insuranceImage && documents.motImage)
  }
}

function buildProfileUpdate(body = {}) {
  const set = {}
  const simpleFields = ['realName', 'phone', 'email', 'address', 'licenseNo']

  simpleFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      set[`driverProfile.${field}`] = String(body[field] || '').trim()
    }
  })

  if (Object.prototype.hasOwnProperty.call(body, 'licenseExpireAt')) {
    set['driverProfile.licenseExpireAt'] = normalizeDate(body.licenseExpireAt) || null
  }

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
  ;['plateNo', 'model'].forEach((field) => {
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
  const match = {
    driverId,
    status: ORDER_STATUS.COMPLETED,
    paymentStatus: 'paid',
    amount: { $gt: 0 }
  }

  if (since) {
    match.createdAt = { $gte: since }
  }

  const result = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        income: { $sum: { $ifNull: ['$amount', 0] } },
        orders: { $sum: 1 }
      }
    }
  ])

  return result[0] || { income: 0, orders: 0 }
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
        status: { $in: [ORDER_STATUS.ASSIGNED, ORDER_STATUS.PENDING] }
      }),
      Order.countDocuments({
        driverId,
        status: { $in: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.STARTED] }
      }),
      Order.find({
        driverId,
        status: {
          $in: [ORDER_STATUS.ASSIGNED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.STARTED]
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

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    {
      $set: {
        'driverProfile.status': status,
        'driverProfile.lastActiveAt': new Date()
      }
    },
    { new: true }
  )
    .select('driverProfile')
    .lean()

  res.json({
    code: 0,
    message: 'success',
    data: {
      status: user?.driverProfile?.status || status,
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
  const driverId = toDriverObjectId(req)

  const [today, week, month, total, withdrawnAmount] = await Promise.all([
    sumCompletedIncome(driverId, startOfToday()),
    sumCompletedIncome(driverId, startOfWeek()),
    sumCompletedIncome(driverId, startOfMonth()),
    sumCompletedIncome(driverId),
    sumWithdrawnAmount(driverId)
  ])
  const availableBalance = Math.max(0, total.income - withdrawnAmount)

  res.json({
    code: 0,
    message: 'success',
    data: {
      todayIncome: today.income,
      weekIncome: week.income,
      monthIncome: month.income,
      totalIncome: total.income,
      withdrawnAmount,
      availableBalance,
      totalOrders: total.orders
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
          ORDER_STATUS.STARTED,
          ORDER_STATUS.COMPLETED
        ]
      }
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate('userId', 'phone role')
      .populate('driverId', 'phone role')
      .populate('assignedDriver', 'phone role driverProfile')
      .lean()

    return res.json({
      code: 0,
      message: 'success',
      data: { orders }
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
        status: ORDER_STATUS.ACCEPTED,
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
            ? ORDER_STATUS.PENDING
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
