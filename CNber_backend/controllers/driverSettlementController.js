const mongoose = require('mongoose')
const Order = require('../models/Order')
const DriverSettlement = require('../models/DriverSettlement')
const { PAYMENT_METHODS } = require('../models/DriverSettlement')
const { auditLog } = require('../utils/auditLog')
const User = require('../models/User')
const ORDER_STATUS = Order.ORDER_STATUS
const { getGbpCnyRate, driverPayoutGbp, gbpToCny } = require('../utils/exchangeRate')
const { roundMoney } = require('../utils/pricing')
const {
  parsePeriodInput,
  resolveListDateRange,
  formatDateOnlyUTC,
  buildPeriodLabel
} = require('../utils/driverSettlementPeriod')

function userIdOf(req) {
  return req.user?.userId || req.user?._id || null
}

function orderDisplayNo(order) {
  if (order.orderNo) return String(order.orderNo)
  if (order.orderDateKey && order.dailySeq != null) {
    return `${order.orderDateKey}-${String(order.dailySeq).padStart(3, '0')}`
  }
  const id = order._id ? String(order._id) : ''
  return id.length > 8 ? id.slice(-8) : id || '—'
}

function idOf(ref) {
  if (!ref) return null
  if (typeof ref === 'object' && ref._id) return String(ref._id)
  return String(ref)
}

function toSettlementDto(doc) {
  const row = doc?.toObject ? doc.toObject() : { ...doc }
  return {
    ...row,
    startDate: row.startDate ? formatDateOnlyUTC(row.startDate) : '',
    endDate: row.endDate ? formatDateOnlyUTC(row.endDate) : ''
  }
}

async function loadDriverMeta(driverId) {
  const user = await User.findById(driverId)
    .select('phone adminProfile driverProfile')
    .lean()
  if (!user) return { driverPhone: '', driverName: '' }
  const name =
    user.driverProfile?.realName ||
    user.adminProfile?.displayName ||
    ''
  return { driverPhone: user.phone || '', driverName: name }
}

async function aggregateCompletedOrders(startDate, endDate) {
  const orders = await Order.find({
    status: ORDER_STATUS.COMPLETED,
    updatedAt: { $gte: startDate, $lte: endDate },
    $or: [{ driverId: { $ne: null } }, { assignedDriver: { $ne: null } }]
  })
    .select(
      '_id orderNo orderDateKey dailySeq driverId assignedDriver assignedDriverName assignedDriverPhone driverPriceGbp driverSettlementAmount priceBreakdown quoteBreakdown amount exchangeRate pickup destination updatedAt'
    )
    .lean()

  const byDriver = new Map()
  for (const order of orders) {
    const driverId = idOf(order.assignedDriver || order.driverId)
    if (!driverId) continue
    if (!byDriver.has(driverId)) {
      byDriver.set(driverId, { orders: [], totalGbp: 0 })
    }
    const bucket = byDriver.get(driverId)
    const gbp =
      order.driverSettlementAmount != null
        ? roundMoney(order.driverSettlementAmount)
        : driverPayoutGbp(order)
    bucket.orders.push(order)
    bucket.totalGbp = roundMoney(bucket.totalGbp + gbp)
  }
  return byDriver
}

/** GET /api/admin/driver-settlements */
exports.listDriverSettlementBatches = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const status = String(req.query.status || '').trim()
  const { startDate, endDate } = resolveListDateRange(req.query)

  const query = {
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  }
  if (status === 'pending' || status === 'paid') {
    query.status = status
  }

  const [items, total] = await Promise.all([
    DriverSettlement.find(query)
      .sort({ startDate: -1, driverSettlementGbp: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    DriverSettlement.countDocuments(query)
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      settlements: items.map(toSettlementDto),
      total,
      page,
      pageSize,
      filterRange: {
        startDate: formatDateOnlyUTC(startDate),
        endDate: formatDateOnlyUTC(endDate)
      }
    }
  })
}

/** GET /api/admin/driver-settlements/:id */
exports.getDriverSettlementBatch = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const doc = await DriverSettlement.findById(id).lean()
  if (!doc) {
    const e = new Error('结算单不存在')
    e.code = 404
    throw e
  }

  const orders = doc.orderIds?.length
    ? await Order.find({ _id: { $in: doc.orderIds } })
        .select(
          '_id orderNo orderDateKey dailySeq pickup destination driverPriceGbp driverSettlementAmount priceBreakdown quoteBreakdown amount updatedAt'
        )
        .lean()
    : []

  const orderRows = orders.map((o) => ({
    _id: o._id,
    orderNo: orderDisplayNo(o),
    pickup: o.pickup,
    destination: o.destination,
    driverSettlementGbp:
      o.driverSettlementAmount != null ? roundMoney(o.driverSettlementAmount) : driverPayoutGbp(o),
    completedAt: o.updatedAt
  }))

  res.json({
    code: 0,
    message: 'success',
    data: {
      settlement: toSettlementDto(doc),
      orders: orderRows
    }
  })
}

/** POST /api/admin/driver-settlements/generate */
exports.generateDriverSettlementBatches = async (req, res) => {
  const { periodType, startDate, endDate, periodLabel } = parsePeriodInput(req.body || {})
  const exchangeRate = await getGbpCnyRate()
  const byDriver = await aggregateCompletedOrders(startDate, endDate)

  let created = 0
  let updated = 0
  let skippedPaid = 0

  for (const [driverId, bucket] of byDriver.entries()) {
    const existing = await DriverSettlement.findOne({
      driverId,
      periodType,
      startDate,
      endDate
    })

    if (existing?.status === 'paid') {
      skippedPaid += 1
      continue
    }

    const meta = await loadDriverMeta(driverId)
    const phoneFromOrder = bucket.orders[0]?.assignedDriverPhone || ''
    const nameFromOrder = bucket.orders[0]?.assignedDriverName || ''
    const driverSettlementGbp = bucket.totalGbp
    const payableCny = gbpToCny(driverSettlementGbp, exchangeRate)
    const payload = {
      periodType,
      startDate,
      endDate,
      periodLabel: periodLabel || buildPeriodLabel(startDate, endDate),
      driverId,
      driverPhone: meta.driverPhone || phoneFromOrder,
      driverName: meta.driverName || nameFromOrder,
      orderIds: bucket.orders.map((o) => o._id),
      orderCount: bucket.orders.length,
      driverSettlementGbp,
      exchangeRate,
      payableCny,
      status: 'pending',
      updatedBy: userIdOf(req)
    }

    if (existing) {
      await DriverSettlement.updateOne({ _id: existing._id }, { $set: payload })
      updated += 1
    } else {
      await DriverSettlement.create({
        ...payload,
        createdBy: userIdOf(req)
      })
      created += 1
    }
  }

  res.json({
    code: 0,
    message: 'success',
    data: {
      periodType,
      startDate: formatDateOnlyUTC(startDate),
      endDate: formatDateOnlyUTC(endDate),
      periodLabel: periodLabel || buildPeriodLabel(startDate, endDate),
      exchangeRate,
      driverCount: byDriver.size,
      created,
      updated,
      skippedPaid
    }
  })
}

/** PATCH /api/admin/driver-settlements/:id/status */
exports.patchDriverSettlementStatus = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }

  const wantPaid = req.body?.status === 'paid' || req.body?.enabled === true
  if (!wantPaid) {
    const e = new Error('V1 仅支持标记为已结算 (status=paid)')
    e.code = 400
    throw e
  }

  const doc = await DriverSettlement.findById(id)
  if (!doc) {
    const e = new Error('结算单不存在')
    e.code = 404
    throw e
  }
  if (doc.status === 'paid') {
    res.json({
      code: 0,
      message: 'success',
      data: { settlement: toSettlementDto(doc.toObject()) }
    })
    return
  }

  doc.status = 'paid'
  doc.paidAt = new Date()
  doc.paidBy = userIdOf(req)
  doc.updatedBy = userIdOf(req)
  if (req.body?.remark) doc.remark = String(req.body.remark).trim()

  const paymentMethod = String(req.body?.paymentMethod || '').trim()
  if (paymentMethod && PAYMENT_METHODS.includes(paymentMethod)) {
    doc.paymentMethod = paymentMethod
  }
  if (req.body?.paymentReference != null) {
    doc.paymentReference = String(req.body.paymentReference).trim()
  }
  if (req.body?.paymentProofUrl != null) {
    doc.paymentProofUrl = String(req.body.paymentProofUrl).trim()
  }
  if (req.body?.paymentRemark != null) {
    doc.paymentRemark = String(req.body.paymentRemark).trim()
  }
  await doc.save()

  void auditLog(req, {
    action: '标记结算',
    module: 'driver_settlements',
    entityId: String(doc._id),
    entityType: 'driver_settlement',
    description: `结算单已标记 paid，应付 CNY ${doc.payableCny}`
  })

  res.json({
    code: 0,
    message: 'success',
    data: { settlement: toSettlementDto(doc.toObject()) }
  })
}
