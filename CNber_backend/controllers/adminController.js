const mongoose = require('mongoose')
const Order = require('../models/Order')
const User = require('../models/User')
const SupportTicket = require('../models/SupportTicket')
const DriverSettlement = require('../models/DriverSettlement')
const Driver = require('../models/Driver')
const StaffDriverRelation = require('../models/StaffDriverRelation')
const PricingRule = require('../models/PricingRule')
const PriceMatrix = require('../models/PriceMatrix')
const ORDER_STATUS = Order.ORDER_STATUS
const DISPATCH_STATUS = Order.DISPATCH_STATUS
const logger = require('../utils/logger')
const {
  fireProfileSync,
  syncProfilesAfterOrderAssigned,
  syncProfilesAfterOrderCompleted,
  syncProfilesAfterOrderCancelled
} = require('../utils/profileSync')
const {
  buildPriceBreakdown,
  buildPaymentFields,
  paymentSummary,
  roundMoney
} = require('../utils/pricing')
const { canDispatchByDeposit, applyReadyToStartStatus } = require('../utils/orderPaymentFlow')
const {
  attachPaymentToOrder,
  buildDepositConfirmedSet,
  buildBalanceConfirmedSet
} = require('../utils/orderPaymentSync')
const { logPushPayload } = require('../utils/operationLog')
const { auditLog } = require('../utils/auditLog')
const { presentOrderForApi, presentOrdersForApi } = require('../utils/orderPresentation')
const { canSoftDeleteOrder, activeOrdersFilter } = require('../utils/orderSoftDelete')
const { resolveRedispatchNotifications } = require('../utils/adminNotifications')
const bcrypt = require('bcryptjs')

function buildPricingPatch(body = {}) {
  const patch = {}
  const numberFields = [
    'baseFare',
    'perMile',
    'perMinute',
    'airportSurcharge',
    'nightSurcharge',
    'serviceMultiplier'
  ]

  for (const field of numberFields) {
    if (body[field] === undefined) continue
    const value = Number(body[field])
    if (!Number.isFinite(value) || value < 0) {
      const e = new Error(`${field} 必须为非负数字`)
      e.code = 400
      throw e
    }
    patch[field] = value
  }

  if (body.enabled !== undefined) patch.enabled = Boolean(body.enabled)
  if (body.note !== undefined) patch.note = String(body.note || '')
  return patch
}

function assertValidServiceType(serviceType) {
  if (!PricingRule.SERVICE_TYPES.includes(serviceType)) {
    const e = new Error('serviceType 非法')
    e.code = 400
    throw e
  }
}

function parseEnabled(value) {
  if (value === undefined || value === null || value === '') return true
  if (typeof value === 'boolean') return value
  const text = String(value).trim().toLowerCase()
  return !['false', '0', 'no', 'disabled', '停用'].includes(text)
}

function splitCsvLine(line) {
  const cells = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    const next = line[i + 1]
    if (ch === '"' && next === '"') {
      cell += '"'
      i += 1
    } else if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += ch
    }
  }
  cells.push(cell.trim())
  return cells
}

function parsePriceMatrixText(text) {
  const raw = String(text || '').trim()
  if (!raw) return []

  if (raw.startsWith('[')) {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      const e = new Error('JSON 必须是数组')
      e.code = 400
      throw e
    }
    return parsed
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  if (lines[0].includes(',')) {
    let rows = lines.map(splitCsvLine)
    const first = rows[0].map((cell) => cell.toLowerCase())
    const hasHeader =
      first.includes('airport') && first.includes('postcodeprefix')
    if (hasHeader) {
      const header = first
      return rows.slice(1).map((cells) => ({
        airport: cells[header.indexOf('airport')],
        postcodePrefix: cells[header.indexOf('postcodeprefix')],
        serviceType: cells[header.indexOf('servicetype')],
        price: cells[header.indexOf('price')],
        note: header.includes('note') ? cells[header.indexOf('note')] || '' : '',
        enabled: header.includes('enabled') ? cells[header.indexOf('enabled')] : true,
        driverPayout: header.includes('driverpayout')
          ? cells[header.indexOf('driverpayout')]
          : undefined
      }))
    }
    return rows.map((cells) => ({
      airport: cells[0],
      postcodePrefix: cells[1],
      serviceType: cells[2],
      price: cells[3],
      note: cells[4] || '',
      enabled: cells[5] === undefined ? true : cells[5]
    }))
  }

  return lines.map((line) => {
    const parts = line.split(/\s+/)
    return {
      airport: parts[0],
      postcodePrefix: parts[1],
      serviceType: parts[2],
      price: parts[3],
      note: parts.slice(4).join(' '),
      enabled: true
    }
  })
}

function normalizePriceMatrixRow(row = {}) {
  const airport = String(row.airport || '').trim().toUpperCase()
  const postcodePrefix = String(row.postcodePrefix || '').trim().toUpperCase()
  const serviceType = String(row.serviceType || '').trim()
  assertValidServiceType(serviceType)

  const price = Number(row.price)
  if (!Number.isFinite(price) || price < 0) {
    const e = new Error('price 必须为大于等于 0 的数字')
    e.code = 400
    throw e
  }
  if (!airport || !postcodePrefix) {
    const e = new Error('airport 和 postcodePrefix 必填')
    e.code = 400
    throw e
  }

  return {
    airport,
    postcodePrefix,
    serviceType,
    price,
    driverPayout:
      row.driverPayout != null && row.driverPayout !== ''
        ? Number(row.driverPayout)
        : undefined,
    enabled: parseEnabled(row.enabled),
    note: row.note != null ? String(row.note) : ''
  }
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function staffObjectId(req) {
  if (!req.user || !req.user.userId) return null
  try {
    return new mongoose.Types.ObjectId(String(req.user.userId))
  } catch {
    return null
  }
}

function driverDisplayName(user) {
  return user?.driverProfile?.realName || user?.phone || ''
}

/** 管理端订单列表筛选（与 orderController 管理端逻辑对齐） */
function buildAdminOrderQuery(querystring) {
  const query = {}
  const {
    status,
    quick,
    serviceType,
    orderId,
    dateFrom,
    dateTo,
    customerPhone,
    paymentStatus,
    depositStatus,
    range = '7d',
    showDeleted
  } = querystring || {}

  if (showDeleted === 'true' || showDeleted === '1') {
    query.isDeleted = true
  } else {
    query.$and = (query.$and || []).concat([activeOrdersFilter()])
  }

  if (status && typeof status === 'string') query.status = status
  if (querystring.dispatchStatus && typeof querystring.dispatchStatus === 'string') {
    query.dispatchStatus = querystring.dispatchStatus
  }
  if (depositStatus === 'unpaid') {
    query.depositPaid = { $ne: true }
    query.$and = (query.$and || []).concat([
      {
        $or: [
          { depositStatus: { $in: ['unpaid', 'rejected', 'pending', 'submitted'] } },
          { 'payment.depositStatus': { $in: ['unpaid', 'pending'] } },
          { depositStatus: { $exists: false } }
        ]
      }
    ])
  }
  if (quick && typeof quick === 'string') {
    if (quick === 'pending_confirm') query.status = ORDER_STATUS.QUOTED
    if (quick === 'pending_deposit') query.status = ORDER_STATUS.CONFIRMED
    if (quick === 'pending_dispatch') {
      query.status = { $in: [ORDER_STATUS.DEPOSIT_PAID, ORDER_STATUS.PENDING, ORDER_STATUS.NEEDS_REDISPATCH] }
      query.depositPaid = { $ne: false }
      query.dispatchStatus = {
        $in: [DISPATCH_STATUS.PENDING, DISPATCH_STATUS.UNASSIGNED, DISPATCH_STATUS.NEEDS_REDISPATCH]
      }
    }
    if (quick === 'needs_redispatch') {
      query.$and = (query.$and || []).concat([
        {
          $or: [
            { status: ORDER_STATUS.NEEDS_REDISPATCH },
            { dispatchStatus: DISPATCH_STATUS.NEEDS_REDISPATCH }
          ]
        }
      ])
    }
    if (quick === 'driver_response') query.dispatchStatus = DISPATCH_STATUS.ASSIGNED
    if (quick === 'today') {
      const start = startOfToday()
      query.createdAt = { ...(query.createdAt || {}), $gte: start }
    }
    if (quick === 'exception') {
      query.$or = [
        { status: ORDER_STATUS.CANCELLED },
        { dispatchStatus: DISPATCH_STATUS.REJECTED },
        { dispatchStatus: DISPATCH_STATUS.CANCELLED }
      ]
    }
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
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      query.createdAt.$lte = end
    }
  } else if (range !== 'all') {
    const daysMap = { '3d': 3, '7d': 7, '14d': 14 }
    const days = daysMap[range] || 7
    const since = new Date()
    since.setDate(since.getDate() - days)
    query.createdAt = { $gte: since }
  }
  if (quick === 'today') {
    query.createdAt = { ...(query.createdAt || {}), $gte: startOfToday() }
  }
  if (customerPhone && String(customerPhone).trim()) {
    /* 异步在调用方处理 */
  }
  return query
}

/**
 * GET /api/admin/orders 分页列表
 */
exports.listAdminOrders = async (req, res) => {
  const query = buildAdminOrderQuery(req.query)
  const { customerPhone } = req.query
  if (customerPhone && String(customerPhone).trim()) {
    const phones = await User.find({
      phone: new RegExp(String(customerPhone).trim(), 'i')
    })
      .select('_id')
      .lean()
    query.userId = { $in: phones.map((u) => u._id) }
  }

  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)))

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1, dailySeq: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('userId', 'phone role')
      .populate('driverId', 'phone role')
      .populate('assignedDriver', 'phone role driverProfile')
      .lean(),
    Order.countDocuments(query)
  ])

  const enrichedOrders = await presentOrdersForApi(orders)

  res.json({
    code: 0,
    message: 'success',
    data: { orders: enrichedOrders, total, page, pageSize }
  })
}

exports.getStats = async (req, res) => {
  const t0 = startOfToday()
  const [
    todayCreated,
    pending,
    assigned,
    accepted,
    started,
    completed,
    completedToday,
    cancelled
  ] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: t0 } }),
    Order.countDocuments({ status: ORDER_STATUS.PENDING }),
    Order.countDocuments({ status: ORDER_STATUS.ASSIGNED }),
    Order.countDocuments({ status: ORDER_STATUS.ACCEPTED }),
    Order.countDocuments({ status: ORDER_STATUS.STARTED }),
    Order.countDocuments({ status: ORDER_STATUS.COMPLETED }),
    Order.countDocuments({
      status: ORDER_STATUS.COMPLETED,
      updatedAt: { $gte: t0 }
    }),
    Order.countDocuments({ status: ORDER_STATUS.CANCELLED })
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      todayOrderCount: todayCreated,
      pendingDispatchCount: pending,
      assignedOrderCount: assigned,
      acceptedOrderCount: accepted,
      inProgressOrderCount: started,
      completedOrderCount: completed,
      completedTodayCount: completedToday,
      cancelledOrderCount: cancelled
    }
  })
}

exports.getDashboard = async (req, res) => {
  const t0 = startOfToday()
  const [
    orderCount,
    pendingOrderCount,
    driverCount,
    availableDriverCount,
    todayOrderCount,
    pendingConfirmCount,
    pendingDepositCount,
    pendingDispatchCount,
    waitingDriverResponseCount,
    exceptionOrderCount,
    inProgressOrderCount,
    completedOrderCount,
    profitRows
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({
      status: { $in: [ORDER_STATUS.CREATED, ORDER_STATUS.PENDING] }
    }),
    User.countDocuments({ role: 'driver' }),
    User.countDocuments({
      role: 'driver',
      'driverProfile.status': 'online',
      $or: [
        { 'driverProfile.approvalStatus': 'approved' },
        { 'driverProfile.documents.reviewStatus': 'approved' }
      ],
      status: { $ne: 'banned' }
    }),
    Order.countDocuments({ createdAt: { $gte: t0 } }),
    Order.countDocuments({ status: ORDER_STATUS.QUOTED }),
    Order.countDocuments({ status: ORDER_STATUS.CONFIRMED }),
    Order.countDocuments({
      status: { $in: [ORDER_STATUS.DEPOSIT_PAID, ORDER_STATUS.PENDING] },
      depositPaid: { $ne: false },
      dispatchStatus: { $in: [DISPATCH_STATUS.PENDING, DISPATCH_STATUS.UNASSIGNED] }
    }),
    Order.countDocuments({ status: ORDER_STATUS.ASSIGNED }),
    Order.countDocuments({
      $or: [
        { status: ORDER_STATUS.CANCELLED },
        { dispatchStatus: DISPATCH_STATUS.REJECTED },
        { dispatchStatus: DISPATCH_STATUS.CANCELLED }
      ]
    }),
    Order.countDocuments({
      status: { $in: [ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.STARTED] }
    }),
    Order.countDocuments({ status: ORDER_STATUS.COMPLETED }),
    Order.aggregate([
      {
        $group: {
          _id: null,
          profit: { $sum: { $ifNull: ['$platformProfitCny', 0] } },
          revenue: { $sum: { $ifNull: ['$customerPriceCny', { $ifNull: ['$payableAmountCny', 0] }] } }
        }
      }
    ])
  ])
  const platformProfit = roundMoney(profitRows[0]?.profit || 0)
  const revenue = roundMoney(profitRows[0]?.revenue || 0)

  res.json({
    code: 0,
    message: 'success',
    data: {
      orderCount,
      pendingOrderCount,
      driverCount,
      availableDriverCount,
      todayOrderCount,
      revenue,
      pendingConfirmCount,
      pendingDepositCount,
      pendingDispatchCount,
      waitingDriverResponseCount,
      assignedOrderCount: waitingDriverResponseCount,
      acceptedOrderCount: waitingDriverResponseCount,
      exceptionOrderCount,
      inProgressOrderCount,
      completedOrderCount,
      platformProfit
    }
  })
}

/** GET /api/admin/mobile/dashboard — 移动端工作台轻量统计 */
exports.getMobileDashboard = async (req, res) => {
  const t0 = startOfToday()
  const [
    paymentReviewCount,
    readyDispatchCount,
    inTripCount,
    openTicketCount,
    todayCompletedCount,
    pendingSettlementCount
  ] = await Promise.all([
    Order.countDocuments({
      $or: [{ depositStatus: 'submitted' }, { balanceStatus: 'submitted' }]
    }),
    Order.countDocuments({
      status: { $in: [ORDER_STATUS.DEPOSIT_PAID, ORDER_STATUS.PENDING] },
      depositPaid: { $ne: false },
      dispatchStatus: { $in: [DISPATCH_STATUS.PENDING, DISPATCH_STATUS.UNASSIGNED] }
    }),
    Order.countDocuments({
      status: { $in: [ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.STARTED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.ASSIGNED] }
    }),
    SupportTicket.countDocuments({
      status: { $in: ['pending', 'in_progress'] }
    }),
    Order.countDocuments({
      status: ORDER_STATUS.COMPLETED,
      updatedAt: { $gte: t0 }
    }),
    DriverSettlement.countDocuments({ status: 'pending' })
  ])

  const alerts = buildMobileAlerts({
    paymentReviewCount,
    readyDispatchCount,
    openTicketCount,
    pendingSettlementCount
  })

  res.json({
    code: 0,
    message: 'success',
    data: {
      paymentReviewCount,
      readyDispatchCount,
      inTripCount,
      openTicketCount,
      todayCompletedCount,
      pendingSettlementCount,
      urgentCount: alerts.filter((a) => a.priority === 'high').length,
      alerts
    }
  })
}

function buildMobileAlerts({
  paymentReviewCount,
  readyDispatchCount,
  openTicketCount,
  pendingSettlementCount
}) {
  const now = new Date().toISOString()
  const alerts = []
  if (paymentReviewCount > 0) {
    alerts.push({
      type: 'payment_review',
      title: `有 ${paymentReviewCount} 笔付款待确认`,
      priority: 'high',
      target: 'dispatch',
      createdAt: now
    })
  }
  if (readyDispatchCount > 0) {
    alerts.push({
      type: 'ready_dispatch',
      title: `有 ${readyDispatchCount} 单待派单`,
      priority: 'high',
      target: 'dispatch',
      createdAt: now
    })
  }
  if (openTicketCount > 0) {
    alerts.push({
      type: 'support_ticket',
      title: `有 ${openTicketCount} 个新工单待处理`,
      priority: 'normal',
      target: 'tickets',
      createdAt: now
    })
  }
  if (pendingSettlementCount > 0) {
    alerts.push({
      type: 'driver_settlement',
      title: `有 ${pendingSettlementCount} 笔司机结算待处理`,
      priority: 'normal',
      target: 'driver_settlement',
      createdAt: now
    })
  }
  return alerts
}

exports.listPricingRules = async (req, res) => {
  await PricingRule.ensureDefaultRules()
  const rules = await PricingRule.find().sort({ serviceType: 1 }).lean()
  res.json({
    code: 0,
    message: 'success',
    data: { rules }
  })
}

exports.updatePricingRule = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('报价规则 ID 无效')
    e.code = 400
    throw e
  }

  const patch = buildPricingPatch(req.body || {})
  const rule = await PricingRule.findByIdAndUpdate(id, patch, { new: true })
  if (!rule) {
    const e = new Error('报价规则不存在')
    e.code = 404
    throw e
  }

  res.json({
    code: 0,
    message: 'success',
    data: { rule }
  })
}

exports.importPricingRules = async (req, res) => {
  if (req.user.role !== 'admin') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  const { rules } = req.body || {}
  if (!Array.isArray(rules)) {
    const e = new Error('rules 必须是数组')
    e.code = 400
    throw e
  }

  const result = {
    created: 0,
    updated: 0,
    failed: [],
    rules: []
  }

  for (let i = 0; i < rules.length; i += 1) {
    const row = rules[i] || {}
    try {
      const serviceType = String(row.serviceType || '').trim()
      assertValidServiceType(serviceType)
      const patch = buildPricingPatch(row)
      patch.serviceType = serviceType

      const existing = await PricingRule.findOne({ serviceType })
      let rule
      if (existing) {
        rule = await PricingRule.findByIdAndUpdate(existing._id, patch, {
          new: true
        })
        result.updated += 1
      } else {
        rule = await PricingRule.create(patch)
        result.created += 1
      }
      result.rules.push(rule)
    } catch (e) {
      result.failed.push({
        index: i,
        serviceType: row.serviceType || '',
        message: e.message || '导入失败'
      })
    }
  }

  res.json({
    code: 0,
    message: '导入完成',
    data: result
  })
}

exports.importPriceMatrix = async (req, res) => {
  if (req.user.role !== 'admin') {
    const e = new Error('Forbidden')
    e.code = 403
    throw e
  }

  let rows
  try {
    rows = parsePriceMatrixText(req.body && req.body.text)
  } catch (e) {
    e.code = e.code || 400
    throw e
  }

  const result = {
    created: 0,
    updated: 0,
    failed: 0,
    total: rows.length,
    items: [],
    errors: []
  }

  for (let i = 0; i < rows.length; i += 1) {
    try {
      const patch = normalizePriceMatrixRow(rows[i])
      const existing = await PriceMatrix.findOne({
        airport: patch.airport,
        postcodePrefix: patch.postcodePrefix,
        serviceType: patch.serviceType
      })

      let item
      let action
      if (existing) {
        item = await PriceMatrix.findByIdAndUpdate(existing._id, patch, {
          new: true
        }).lean()
        result.updated += 1
        action = 'updated'
      } else {
        item = await PriceMatrix.create(patch)
        item = item.toObject()
        result.created += 1
        action = 'created'
      }

      result.items.push({ action, item })
    } catch (e) {
      result.failed += 1
      result.errors.push({
        index: i,
        row: rows[i],
        message: e.message || '导入失败'
      })
    }
  }

  res.json({
    code: 0,
    message: '导入完成',
    data: result
  })
}

exports.getOrderDetail = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }
  const order = await Order.findById(id)
    .populate('userId', 'phone role driverProfile')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')
    .lean()

  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  const { buildOrderFinanceSnapshot } = require('../utils/orderFinanceSnapshot')
  const { enrichOrderPaymentFields } = require('../utils/enrichOrderPayments')
  const withPayments = await enrichOrderPaymentFields(order)
  const withPayment = attachPaymentToOrder(withPayments)
  const enriched = await presentOrderForApi(withPayment, { withPayment: false })
  const orderRatingController = require('../controllers/orderRatingController')
  const rating = await orderRatingController.getOrderRatingForAdmin(id)
  res.json({
    code: 0,
    message: 'success',
    data: { order: enriched, finance: buildOrderFinanceSnapshot(enriched), rating }
  })
}

/**
 * 后台指派司机：pending → assigned，写入 driverId；司机端确认后再 accepted
 * POST /assign 与 POST /assign-driver 共用
 */
exports.assignDriver = async (req, res) => {
  const { id } = req.params
  const body = req.body || {}
  let driverUserId = body.driverUserId || body.driverId

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }
  if (!driverUserId || !mongoose.Types.ObjectId.isValid(String(driverUserId))) {
    const e = new Error('缺少或无效的 driverId')
    e.code = 400
    throw e
  }

  let driverUser = await User.findById(driverUserId).select('phone role driverProfile')
  if (!driverUser || driverUser.role !== 'driver') {
    const driverDoc = await Driver.findById(driverUserId).select('userId isActive verificationStatus status').lean()
    if (driverDoc?.userId) {
      driverUserId = String(driverDoc.userId)
      driverUser = await User.findById(driverUserId).select('phone role driverProfile')
    }
  }
  if (!driverUser || driverUser.role !== 'driver') {
    const e = new Error('司机不存在')
    e.code = 400
    throw e
  }
  const driverDoc = await Driver.findOne({ userId: driverUser._id }).lean()
  if (driverDoc && driverDoc.isActive === false) {
    const e = new Error('司机未启用，无法派单')
    e.code = 400
    throw e
  }
  const approvalStatus =
    driverDoc?.verificationStatus ||
    driverUser.driverProfile?.approvalStatus ||
    driverUser.driverProfile?.documents?.reviewStatus ||
    driverDoc?.status ||
    'pending'
  if (approvalStatus !== 'approved') {
    const e = new Error('司机未审核通过，无法派单')
    e.code = 400
    throw e
  }

  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  const assignableStatuses = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.ASSIGNED,
    ORDER_STATUS.DEPOSIT_PAID,
    ORDER_STATUS.NEEDS_REDISPATCH
  ]
  if (!assignableStatuses.includes(current.status)) {
    const e = new Error('当前订单状态不可派单')
    e.code = 400
    throw e
  }
  if (!canDispatchByDeposit(current)) {
    const e = new Error('定金未确认，不能派单')
    e.code = 400
    throw e
  }

  const prevDriverId =
    current.driverId && String(current.driverId._id || current.driverId)
  const isReassign = Boolean(prevDriverId && prevDriverId !== String(driverUser._id))
  const logAction = isReassign ? 'reassign_driver' : 'assign_driver'
  const logMsg = isReassign
    ? `改派司机：${driverUser.phone || driverUser._id}（原司机 ${current.assignedDriverPhone || prevDriverId}）`
    : `派单给司机 ${driverUser.phone || driverUser._id}`

  const order = await Order.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        driverId: driverUser._id,
        assignedDriver: driverUser._id,
        assignedDriverName: driverDisplayName(driverUser),
        assignedDriverPhone: driverUser.phone || '',
        assignedAt: new Date(),
        dispatchStatus: DISPATCH_STATUS.ASSIGNED,
        status: [
          ORDER_STATUS.PENDING,
          ORDER_STATUS.DEPOSIT_PAID,
          ORDER_STATUS.NEEDS_REDISPATCH
        ].includes(current.status)
          ? ORDER_STATUS.ASSIGNED
          : current.status,
        updatedAt: new Date()
      },
      $push: logPushPayload(req, logAction, logMsg)
    },
    { new: true }
  )
    .populate('userId', 'phone role driverProfile')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')

  if (!order) {
    const e = new Error('订单不存在')
    e.code = 400
    throw e
  }

  logger.info(`已通知司机 ${driverUser.phone || driverUser._id} 接单：${order._id}`)
  logger.info(`订单状态变化：${order._id} -> ${order.status}`)

  fireProfileSync(syncProfilesAfterOrderAssigned, order, 'assignDriver')
  await resolveRedispatchNotifications(order._id)

  void auditLog(req, {
    action: isReassign ? '改派司机' : '派单',
    module: 'dispatch',
    entityId: String(order._id),
    entityType: 'order',
    description: logMsg
  })

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.unassignDriver = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }

  const current = await Order.findById(id).select('status depositPaid')
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
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
        dispatchStatus: DISPATCH_STATUS.PENDING,
        status:
          current.status === ORDER_STATUS.ASSIGNED
            ? current.depositPaid
              ? ORDER_STATUS.DEPOSIT_PAID
              : ORDER_STATUS.PENDING
            : current.status,
        updatedAt: new Date()
      },
      $push: logPushPayload(req, 'unassign_driver', '取消派单，司机已清空')
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')

  void auditLog(req, {
    action: '取消派单',
    module: 'dispatch',
    entityId: String(id),
    entityType: 'order',
    description: '取消派单，司机已清空'
  })

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.addFollowUpNote = async (req, res) => {
  const { id } = req.params
  const { content } = req.body || {}
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }
  if (!content || !String(content).trim()) {
    const e = new Error('备注内容不能为空')
    e.code = 400
    throw e
  }

  const authorPhone = req.user.phone || ''
  const authorStaffId = staffObjectId(req)
  const authorDisplay = authorPhone || String(req.user.userId || '')

  const noteDoc = {
    content: String(content).trim(),
    createdAt: new Date(),
    authorPhone,
    authorDisplay
  }
  if (authorStaffId) noteDoc.authorStaffId = authorStaffId

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $push: {
        followUpNotes: noteDoc
      },
      $set: { updatedAt: new Date() }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  if (!order) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }

  const allowed = new Set(Object.values(ORDER_STATUS))
  if (!status || !allowed.has(status)) {
    const e = new Error('非法状态值')
    e.code = 400
    throw e
  }

  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  const cur = current.status
  const next = status

  const ok =
    (cur === ORDER_STATUS.PENDING && next === ORDER_STATUS.CANCELLED) ||
    (cur === ORDER_STATUS.ASSIGNED &&
      (next === ORDER_STATUS.CANCELLED || next === ORDER_STATUS.PENDING)) ||
    (cur === ORDER_STATUS.ACCEPTED &&
      (next === ORDER_STATUS.STARTED ||
        next === ORDER_STATUS.CANCELLED ||
        next === ORDER_STATUS.PENDING)) ||
    (cur === ORDER_STATUS.STARTED &&
      (next === ORDER_STATUS.COMPLETED ||
        next === ORDER_STATUS.CANCELLED)) ||
    (cur === ORDER_STATUS.COMPLETED && next === ORDER_STATUS.COMPLETED) ||
    (cur === ORDER_STATUS.CANCELLED && next === ORDER_STATUS.CANCELLED)

  if (!ok) {
    const e = new Error(`不允许从 ${cur} 变更为 ${next}`)
    e.code = 400
    throw e
  }

  const patch = { status: next, updatedAt: new Date() }
  if (next === ORDER_STATUS.PENDING) {
    patch.driverId = null
    patch.assignedDriver = null
    patch.assignedDriverName = ''
    patch.assignedDriverPhone = ''
    patch.assignedAt = null
    patch.dispatchStatus = DISPATCH_STATUS.UNASSIGNED
  }

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: patch,
      $push: logPushPayload(req, 'update_status', `订单状态：${cur} → ${next}`)
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')

  if (order && next === ORDER_STATUS.COMPLETED) {
    fireProfileSync(syncProfilesAfterOrderCompleted, order, 'updateOrderStatus:completed')
  } else if (order && next === ORDER_STATUS.CANCELLED) {
    fireProfileSync(syncProfilesAfterOrderCancelled, order, 'updateOrderStatus:cancelled')
  }

  res.json({
    code: 0,
    message: 'success',
    data: { order }
  })
}

exports.markDepositPaid = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }
  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  const set = {
    ...buildPaymentFields(paymentSummary(current).totalPrice),
    ...buildDepositConfirmedSet(current, req.user.userId),
    status: ORDER_STATUS.DEPOSIT_PAID
  }
  const order = await Order.findByIdAndUpdate(id, { $set: set }, { new: true })
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')

  logger.info(`订单状态变化：${id} -> ${ORDER_STATUS.DEPOSIT_PAID}`)
  res.json({
    code: 0,
    message: 'success',
    data: { order: attachPaymentToOrder(order.toObject ? order.toObject() : order) }
  })
}

exports.markRemainingPaid = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }
  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  const summary = paymentSummary(current)
  if (!summary.depositPaid) {
    const e = new Error('请先支付订金')
    e.code = 400
    throw e
  }
  const set = applyReadyToStartStatus(current, {
    ...buildBalanceConfirmedSet(current, req.user.userId),
    status: ORDER_STATUS.READY_TO_START
  })
  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: set
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')

  logger.info(
    `订单状态变化：${id} -> ${set.status || current.status}（尾款确认${set.status ? '' : '，未派司机保持原状态'}）`
  )
  res.json({
    code: 0,
    message: 'success',
    data: { order: attachPaymentToOrder(order.toObject ? order.toObject() : order) }
  })
}

exports.listDrivers = async (req, res) => {
  const page = Number(req.query.page || 1)
  const pageSize = Number(req.query.pageSize || 20)
  const status = req.query.status || ''
  const search = (req.query.search || '').trim()

  const query = {}
  if (status) query.status = status

  if (search) {
    const users = await User.find({
      role: 'driver',
      phone: new RegExp(search, 'i')
    })
      .select('_id')
      .lean()
    query.userId = { $in: users.map((u) => u._id) }
  }

  const drivers = await Driver.find(query)
    .populate('userId', 'phone role driverProfile')
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean()

  const total = await Driver.countDocuments(query)

  res.json({
    code: 0,
    message: 'success',
    data: { drivers, total, page, pageSize }
  })
}

function normalizeAdminDriverRow(driverUser, driverDoc, extra = {}) {
  const profile = driverUser?.driverProfile || {}
  const userId = driverUser?._id ? String(driverUser._id) : ''
  const driverDocId = driverDoc?._id ? String(driverDoc._id) : ''
  const approvalStatus =
    driverDoc?.verificationStatus ||
    profile.approvalStatus ||
    profile.documents?.reviewStatus ||
    driverDoc?.status ||
    'pending'
  const serviceStatus = driverDoc?.serviceStatus || profile.status || 'offline'
  const status = profile.status || serviceStatus || driverDoc?.status || 'offline'
  const phone = profile.phone || driverUser?.phone || ''
  const carPlate =
    driverDoc?.carPlate ||
    driverDoc?.vehiclePlate ||
    profile.vehiclePlate ||
    profile.vehicle?.plateNo ||
    ''
  const carModel =
    driverDoc?.vehicleModel ||
    profile.vehicleModel ||
    profile.vehicle?.model ||
    ''
  const available =
    driverDoc?.available !== false &&
    (driverDoc?.available === true ||
      status === 'online' ||
      serviceStatus === 'idle' ||
      serviceStatus === 'available')
  return {
    _id: userId || driverDocId,
    id: userId || driverDocId,
    userId,
    driverDocId,
    phone,
    name: profile.realName || phone || '',
    label: `${phone} / ${carPlate || '—'} / ${carModel || '—'}`,
    status: status === 'approved' ? 'online' : status,
    approvalStatus,
    reviewStatus: approvalStatus,
    verificationStatus: driverDoc?.verificationStatus || approvalStatus,
    available,
    serviceStatus,
    carPlate,
    carModel,
    vehicle: {
      plateNo: carPlate,
      model: carModel,
      seats: profile.vehicle?.seats || ''
    },
    ...extra
  }
}

exports.listAvailableDrivers = async (req, res) => {
  const onlineUsers = await User.find({
    role: 'driver',
    'driverProfile.status': 'online'
  })
    .select('phone role driverProfile')
    .lean()

  const approvedDriverDocs = await Driver.find({
    verificationStatus: 'approved',
    isActive: { $ne: false },
    available: { $ne: false }
  })
    .select('userId status available serviceStatus verificationStatus carPlate vehiclePlate vehicleModel')
    .lean()

  const userById = new Map(onlineUsers.map((u) => [String(u._id), u]))
  for (const doc of approvedDriverDocs) {
    if (!doc.userId) continue
    const uid = String(doc.userId)
    if (!userById.has(uid)) {
      const u = await User.findById(uid).select('phone role driverProfile').lean()
      if (u && u.role === 'driver') userById.set(uid, u)
    }
  }

  const start = startOfToday()
  const rows = (
    await Promise.all(
      [...userById.values()].map(async (driver) => {
        const driverDoc = approvedDriverDocs.find((d) => String(d.userId) === String(driver._id)) ||
          (await Driver.findOne({ userId: driver._id })
            .select('status available serviceStatus verificationStatus carPlate vehiclePlate vehicleModel')
            .lean())
        if (driverDoc && driverDoc.available === false) return null
        const approvalStatus =
          driverDoc?.verificationStatus ||
          driver.driverProfile?.approvalStatus ||
          driver.driverProfile?.documents?.reviewStatus ||
          driverDoc?.status ||
          'pending'
        if (approvalStatus !== 'approved') return null

        const [ongoingOrdersCount, todayOrdersCount] = await Promise.all([
          Order.countDocuments({
            $or: [{ driverId: driver._id }, { assignedDriver: driver._id }],
            status: {
              $in: [
                ORDER_STATUS.ASSIGNED,
                ORDER_STATUS.ACCEPTED,
                ORDER_STATUS.DRIVER_ACCEPTED,
                ORDER_STATUS.READY_TO_START,
                ORDER_STATUS.STARTED,
                ORDER_STATUS.IN_PROGRESS
              ]
            }
          }),
          Order.countDocuments({
            $or: [{ driverId: driver._id }, { assignedDriver: driver._id }],
            createdAt: { $gte: start }
          })
        ])

        return normalizeAdminDriverRow(driver, driverDoc, {
          ongoingOrdersCount,
          todayOrdersCount
        })
      })
    )
  ).filter(Boolean)

  res.json({
    code: 0,
    message: 'success',
    data: {
      drivers: rows,
      items: rows,
      total: rows.length
    }
  })
}

function sortDispatchDrivers(a, b) {
  const ra = a.relation?.relationScore ?? 0
  const rb = b.relation?.relationScore ?? 0
  if (rb !== ra) return rb - ra
  const sa = a.score ?? 0
  const sb = b.score ?? 0
  if (sb !== sa) return sb - sa
  return (b.totalOrders || 0) - (a.totalOrders || 0)
}

/**
 * GET /api/admin/drivers/for-dispatch?orderId=
 * 按当前登录 staff 的关系分桶：team / familiar / external
 * orderId 预留，当前不参与过滤
 */
exports.getDriversForDispatch = async (req, res) => {
  const staffId = staffObjectId(req)
  if (!staffId) {
    return res.status(401).json({
      code: 401,
      message: '无效登录',
      data: null
    })
  }

  const relations = await StaffDriverRelation.find({ staffId }).lean()
  const relByDriver = new Map()
  for (const r of relations) {
    relByDriver.set(String(r.driverUserId), r)
  }

  const drivers = await Driver.find({ status: 'approved' })
    .populate('userId', 'phone role driverProfile')
    .lean()

  const enriched = drivers.map((d) => {
    const uid = d.userId && (d.userId._id || d.userId)
    const uidStr = uid ? String(uid) : ''
    const rel = uidStr ? relByDriver.get(uidStr) : null
    return {
      ...d,
      relation: rel
        ? {
            layer: rel.layer,
            relationScore: rel.relationScore,
            note: rel.note,
            updatedAt: rel.updatedAt
          }
        : null
    }
  })

  const team = []
  const familiar = []
  const external = []

  for (const row of enriched) {
    const uid = row.userId && (row.userId._id || row.userId)
    if (!uid) continue
    const rel = relByDriver.get(String(uid))
    const layer = rel ? rel.layer : 'external'
    if (layer === 'team') team.push(row)
    else if (layer === 'familiar') familiar.push(row)
    else external.push(row)
  }

  team.sort(sortDispatchDrivers)
  familiar.sort(sortDispatchDrivers)
  external.sort(sortDispatchDrivers)
  const dispatchDrivers = [...team, ...familiar, ...external].map((row) => {
    const uid = row.userId && (row.userId._id || row.userId)
    const normalized = normalizeAdminDriverRow(
      typeof row.userId === 'object' ? row.userId : { _id: uid, phone: row.phone, driverProfile: {} },
      row,
      {
        relation: row.relation || null,
        score: row.score,
        totalOrders: row.totalOrders
      }
    )
    return {
      ...row,
      ...normalized,
      userId: row.userId
    }
  })

  res.json({
    code: 0,
    message: 'success',
    data: {
      orderId: req.query.orderId || null,
      drivers: dispatchDrivers,
      items: dispatchDrivers,
      total: dispatchDrivers.length,
      team: dispatchDrivers.filter((d) => d.relation?.layer === 'team'),
      familiar: dispatchDrivers.filter((d) => d.relation?.layer === 'familiar'),
      external: dispatchDrivers.filter((d) => !d.relation || d.relation.layer === 'external')
    }
  })
}

/**
 * PUT /api/admin/staff-driver-relations
 * body: { driverUserId, layer, note?, relationScore? }
 */
exports.upsertStaffDriverRelation = async (req, res) => {
  const staffId = staffObjectId(req)
  if (!staffId) {
    const e = new Error('无效登录')
    e.code = 401
    throw e
  }

  const { driverUserId, layer, note, relationScore } = req.body || {}
  if (!driverUserId || !mongoose.Types.ObjectId.isValid(String(driverUserId))) {
    const e = new Error('缺少或无效的 driverUserId')
    e.code = 400
    throw e
  }
  const layers = new Set(['team', 'familiar', 'external'])
  if (!layer || !layers.has(layer)) {
    const e = new Error('layer 必须为 team、familiar 或 external')
    e.code = 400
    throw e
  }

  const driverUser = await User.findById(driverUserId)
  if (!driverUser || driverUser.role !== 'driver') {
    const e = new Error('目标不是司机用户')
    e.code = 400
    throw e
  }

  const doc = await StaffDriverRelation.findOneAndUpdate(
    { staffId, driverUserId: driverUser._id },
    {
      $set: {
        layer,
        note: note != null ? String(note) : '',
        relationScore:
          relationScore != null && !Number.isNaN(Number(relationScore))
            ? Number(relationScore)
            : 0,
        updatedAt: new Date(),
        updatedBy: staffId
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()

  res.json({
    code: 0,
    message: 'success',
    data: { relation: doc }
  })
}

function maxDate(a, b) {
  const da = a ? new Date(a) : null
  const db = b ? new Date(b) : null
  if (da && !isNaN(da.getTime()) && db && !isNaN(db.getTime())) {
    return da >= db ? da : db
  }
  if (da && !isNaN(da.getTime())) return da
  if (db && !isNaN(db.getTime())) return db
  return null
}

/**
 * GET /api/admin/customers
 * 仅 role=user 的乘客
 */
exports.listCustomers = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)))
  const search = (req.query.search || '').trim()
  const status = (req.query.status || '').trim()

  const query = { role: 'user' }
  if (status === 'active' || status === 'banned') {
    query.status = status
  }
  if (search) {
    const re = new RegExp(search, 'i')
    query.$or = [
      { phone: re },
      { 'passengerProfile.realName': re },
      { 'passengerProfile.email': re }
    ]
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    User.countDocuments(query)
  ])

  const userIds = users.map((u) => u._id)
  const statsByUser = new Map()
  if (userIds.length) {
    const rows = await Order.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: '$userId',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', ORDER_STATUS.COMPLETED] }, 1, 0]
            }
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', ORDER_STATUS.CANCELLED] }, 1, 0]
            }
          },
          lastOrderAt: { $max: '$createdAt' }
        }
      }
    ])
    for (const row of rows) {
      statsByUser.set(String(row._id), row)
    }
  }

  const customers = users.map((u) => {
    const pp = u.passengerProfile || {}
    const stats = statsByUser.get(String(u._id)) || {}
    const lastLoginAt = pp.lastLoginAt || null
    const lastOrderAt = stats.lastOrderAt || null
    return {
      _id: u._id,
      name: pp.realName || '',
      phone: u.phone,
      email: pp.email || '',
      registeredAt: u.createdAt,
      lastLoginAt,
      lastOrderAt,
      lastActivityAt: maxDate(lastLoginAt, lastOrderAt),
      totalOrders: stats.totalOrders || 0,
      completedOrders: stats.completedOrders || 0,
      cancelledOrders: stats.cancelledOrders || 0,
      status: u.status || 'active'
    }
  })

  res.json({
    code: 0,
    message: 'success',
    data: { customers, total, page, pageSize }
  })
}

/**
 * GET /api/admin/customers/:id/orders
 */
exports.getCustomerOrders = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password').lean()
  if (!user || user.role !== 'user') {
    return res.status(404).json({
      code: 404,
      message: '客户不存在',
      data: null
    })
  }

  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)))

  const filter = { userId: user._id }
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, dailySeq: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('driverId', 'phone role')
      .populate('assignedDriver', 'phone role driverProfile')
      .lean(),
    Order.countDocuments(filter)
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      customer: {
        _id: user._id,
        phone: user.phone,
        name: user.passengerProfile?.realName || '',
        status: user.status || 'active'
      },
      orders,
      total,
      page,
      pageSize
    }
  })
}

/**
 * PATCH /api/admin/customers/:id/status
 * body: { status: 'active' | 'banned' }
 */
exports.updateCustomerStatus = async (req, res) => {
  const nextStatus = req.body?.status
  if (!['active', 'banned'].includes(nextStatus)) {
    const e = new Error('status 须为 active 或 banned')
    e.code = 400
    throw e
  }

  const user = await User.findOne({ _id: req.params.id, role: 'user' })
  if (!user) {
    const e = new Error('客户不存在')
    e.code = 404
    throw e
  }

  user.status = nextStatus
  await user.save()

  res.json({
    code: 0,
    message: 'success',
    data: {
      customer: {
        _id: user._id,
        phone: user.phone,
        status: user.status
      }
    }
  })
}

/**
 * PATCH /api/admin/orders/:id/delete
 * 软删除订单（需管理员密码确认，仅 admin 路由可访问）
 */
exports.softDeleteOrder = async (req, res) => {
  if (req.user?.role !== 'admin') {
    const e = new Error('仅管理员可删除订单')
    e.code = 403
    throw e
  }

  const { id } = req.params
  const adminPassword = String(req.body?.adminPassword || '')
  const reason = String(req.body?.reason || '').trim()

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }
  if (!adminPassword) {
    const e = new Error('请输入管理员密码')
    e.code = 400
    throw e
  }
  if (!reason) {
    const e = new Error('请填写删除原因')
    e.code = 400
    throw e
  }

  const adminUser = await User.findById(req.user.userId).select('+password')
  if (!adminUser) {
    const e = new Error('管理员不存在')
    e.code = 403
    throw e
  }
  const passwordOk = await bcrypt.compare(adminPassword, adminUser.password || '')
  if (!passwordOk) {
    const e = new Error('管理员密码错误')
    e.code = 403
    throw e
  }

  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }

  const gate = canSoftDeleteOrder(current.toObject ? current.toObject() : current)
  if (!gate.ok) {
    const e = new Error(gate.message || '当前订单不可删除')
    e.code = 400
    throw e
  }

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: staffObjectId(req),
        deleteReason: reason,
        updatedAt: new Date()
      },
      $push: logPushPayload(
        req,
        'delete_order',
        `软删除订单：${reason}`
      )
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .lean()

  const enriched = await presentOrderForApi(order, { withPayment: false })
  res.json({
    code: 0,
    message: '订单已归档删除',
    data: { order: enriched }
  })
}
