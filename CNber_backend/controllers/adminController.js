const mongoose = require('mongoose')
const Order = require('../models/Order')
const User = require('../models/User')
const Driver = require('../models/Driver')
const StaffDriverRelation = require('../models/StaffDriverRelation')
const PricingRule = require('../models/PricingRule')
const PriceMatrix = require('../models/PriceMatrix')
const ORDER_STATUS = Order.ORDER_STATUS
const DISPATCH_STATUS = Order.DISPATCH_STATUS

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
    if (hasHeader) rows = rows.slice(1)
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
    serviceType,
    orderId,
    dateFrom,
    dateTo,
    customerPhone,
    paymentStatus,
    range = '7d'
  } = querystring || {}

  if (status && typeof status === 'string') query.status = status
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

  res.json({
    code: 0,
    message: 'success',
    data: { orders, total, page, pageSize }
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
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')
    .lean()

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

/**
 * 后台指派司机：pending → assigned，写入 driverId；司机端确认后再 accepted
 * POST /assign 与 POST /assign-driver 共用
 */
exports.assignDriver = async (req, res) => {
  const { id } = req.params
  const body = req.body || {}
  const driverUserId = body.driverUserId || body.driverId

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

  const driverUser = await User.findById(driverUserId).select('phone role driverProfile')
  if (!driverUser || driverUser.role !== 'driver') {
    const e = new Error('司机不存在')
    e.code = 400
    throw e
  }
  if (driverUser.driverProfile?.status !== 'online') {
    const e = new Error('司机当前不在线，无法派单')
    e.code = 400
    throw e
  }

  const current = await Order.findById(id).select('status paymentStatus')
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  if (![ORDER_STATUS.PENDING, ORDER_STATUS.ASSIGNED].includes(current.status)) {
    const e = new Error('当前订单状态不可派单')
    e.code = 400
    throw e
  }

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
        status:
          current.status === ORDER_STATUS.PENDING
            ? ORDER_STATUS.ASSIGNED
            : current.status,
        updatedAt: new Date()
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')

  if (!order) {
    const e = new Error('订单不存在')
    e.code = 400
    throw e
  }

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

  const current = await Order.findById(id).select('status')
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
        dispatchStatus: DISPATCH_STATUS.UNASSIGNED,
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

  const order = await Order.findByIdAndUpdate(id, patch, { new: true })
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({
    code: 0,
    message: 'success',
    data: { order }
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
    .populate('userId', 'phone role')
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

exports.listAvailableDrivers = async (req, res) => {
  const drivers = await User.find({
    role: 'driver',
    'driverProfile.status': 'online'
  })
    .select('phone role driverProfile')
    .lean()

  const start = startOfToday()
  const rows = await Promise.all(
    drivers.map(async (driver) => {
      const [ongoingOrdersCount, todayOrdersCount] = await Promise.all([
        Order.countDocuments({
          $or: [{ driverId: driver._id }, { assignedDriver: driver._id }],
          status: { $in: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.STARTED] }
        }),
        Order.countDocuments({
          $or: [{ driverId: driver._id }, { assignedDriver: driver._id }],
          createdAt: { $gte: start }
        })
      ])
      const profile = driver.driverProfile || {}
      return {
        _id: driver._id,
        name: profile.realName || driver.phone || '',
        phone: profile.phone || driver.phone || '',
        status: profile.status || 'offline',
        vehicle: {
          plateNo: profile.vehicle?.plateNo || '',
          model: profile.vehicle?.model || '',
          seats: profile.vehicle?.seats || ''
        },
        reviewStatus: profile.documents?.reviewStatus || 'pending',
        ongoingOrdersCount,
        todayOrdersCount
      }
    })
  )

  res.json({
    code: 0,
    message: 'success',
    data: rows
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
    const e = new Error('无效登录')
    e.code = 401
    throw e
  }

  const relations = await StaffDriverRelation.find({ staffId }).lean()
  const relByDriver = new Map()
  for (const r of relations) {
    relByDriver.set(String(r.driverUserId), r)
  }

  const drivers = await Driver.find({ status: 'approved' })
    .populate('userId', 'phone role')
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

  res.json({
    code: 0,
    message: 'success',
    data: {
      orderId: req.query.orderId || null,
      team,
      familiar,
      external
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
