const mongoose = require('mongoose')
const Coupon = require('../models/Coupon')
const {
  normalizeCouponCode,
  getCouponStatus,
  getCouponStatusLabel,
  STATUS
} = require('../utils/couponEngine')

function requireAdmin(req) {
  if (req.user?.role !== 'admin') {
    const e = new Error('仅管理员可修改优惠券')
    e.code = 403
    throw e
  }
}

function userIdOf(req) {
  return req.user?.userId || req.user?._id || null
}

function parseDate(raw, label) {
  if (!raw) {
    const e = new Error(`${label} 必填`)
    e.code = 400
    throw e
  }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) {
    const e = new Error(`${label} 格式无效`)
    e.code = 400
    throw e
  }
  return d
}

function parseStringArray(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean)
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  }
  return []
}

function pickCouponBody(body = {}, isCreate = false) {
  const name = String(body.name || '').trim()
  const code = normalizeCouponCode(body.code)
  const type = body.type === 'percent' ? 'percent' : 'fixed'
  const discountAmountCny = Math.max(0, Number(body.discountAmountCny ?? 0))
  const discountPercent = Math.min(100, Math.max(0, Number(body.discountPercent ?? 0)))
  const minSpendCny = Math.max(0, Number(body.minSpendCny ?? 0))
  const serviceTypes = parseStringArray(body.serviceTypes)
  const vehicleClasses = parseStringArray(body.vehicleClasses)
  const usageLimit = Math.max(0, Number(body.usageLimit ?? 0))
  const perUserLimit = Math.max(0, Number(body.perUserLimit ?? 1))
  const startAt = parseDate(body.startAt, '开始时间')
  const endAt = parseDate(body.endAt, '结束时间')
  const enabled = body.enabled !== false
  const remark = String(body.remark ?? '').trim()

  if (!name) {
    const e = new Error('优惠券名称必填')
    e.code = 400
    throw e
  }
  if (!code) {
    const e = new Error('优惠码必填')
    e.code = 400
    throw e
  }
  if (endAt <= startAt) {
    const e = new Error('结束时间须晚于开始时间')
    e.code = 400
    throw e
  }
  if (type === 'fixed' && discountAmountCny <= 0 && isCreate) {
    const e = new Error('固定优惠金额须大于 0')
    e.code = 400
    throw e
  }

  return {
    name,
    code,
    type,
    discountAmountCny,
    discountPercent,
    minSpendCny,
    serviceTypes,
    vehicleClasses,
    usageLimit,
    perUserLimit,
    startAt,
    endAt,
    enabled,
    remark
  }
}

function toCouponDto(doc, now = new Date()) {
  const row = doc?.toObject ? doc.toObject() : { ...doc }
  const status = getCouponStatus(row, now)
  return {
    ...row,
    status,
    statusLabel: getCouponStatusLabel(row, now)
  }
}

function buildListQuery(query = {}) {
  const q = {}
  const keyword = String(query.keyword || '').trim()
  if (keyword) {
    const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    q.$or = [{ name: re }, { code: re }]
  }
  if (query.serviceType) {
    q.$or = q.$or || []
    // serviceTypes empty = all, or includes type
    q.$and = q.$and || []
    q.$and.push({
      $or: [{ serviceTypes: { $size: 0 } }, { serviceTypes: String(query.serviceType) }]
    })
  }
  if (query.enabled === 'true' || query.enabled === '1') q.enabled = true
  if (query.enabled === 'false' || query.enabled === '0') q.enabled = false
  return q
}

function matchesStatusFilter(row, statusFilter, now) {
  if (!statusFilter) return true
  return getCouponStatus(row, now) === statusFilter
}

exports.listCoupons = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const statusFilter = String(req.query.status || '').trim()
  const now = new Date()
  const baseQuery = buildListQuery(req.query)

  let items
  let total
  if (statusFilter && Object.values(STATUS).includes(statusFilter)) {
    const all = await Coupon.find(baseQuery).sort({ createdAt: -1 }).lean()
    const filtered = all.filter((row) => matchesStatusFilter(row, statusFilter, now))
    total = filtered.length
    items = filtered.slice((page - 1) * pageSize, page * pageSize)
  } else {
    total = await Coupon.countDocuments(baseQuery)
    items = await Coupon.find(baseQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()
  }

  res.json({
    code: 0,
    message: 'success',
    data: {
      coupons: items.map((row) => toCouponDto(row, now)),
      total,
      page,
      pageSize
    }
  })
}

exports.getCoupon = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const doc = await Coupon.findById(id).lean()
  if (!doc) {
    const e = new Error('优惠券不存在')
    e.code = 404
    throw e
  }
  res.json({
    code: 0,
    message: 'success',
    data: { coupon: toCouponDto(doc) }
  })
}

exports.createCoupon = async (req, res) => {
  requireAdmin(req)
  const fields = pickCouponBody(req.body, true)
  try {
    const doc = await Coupon.create({
      ...fields,
      usedCount: 0,
      createdBy: userIdOf(req),
      updatedBy: userIdOf(req)
    })
    res.status(201).json({
      code: 0,
      message: 'success',
      data: { coupon: toCouponDto(doc.toObject()) }
    })
  } catch (err) {
    if (err && err.code === 11000) {
      const e = new Error('优惠码已存在')
      e.code = 409
      throw e
    }
    throw err
  }
}

exports.updateCoupon = async (req, res) => {
  requireAdmin(req)
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const fields = pickCouponBody(req.body, false)
  try {
    const doc = await Coupon.findByIdAndUpdate(
      id,
      { $set: { ...fields, updatedBy: userIdOf(req) } },
      { new: true, runValidators: true }
    ).lean()
    if (!doc) {
      const e = new Error('优惠券不存在')
      e.code = 404
      throw e
    }
    res.json({
      code: 0,
      message: 'success',
      data: { coupon: toCouponDto(doc) }
    })
  } catch (err) {
    if (err && err.code === 11000) {
      const e = new Error('优惠码已存在')
      e.code = 409
      throw e
    }
    throw err
  }
}

exports.patchCouponStatus = async (req, res) => {
  requireAdmin(req)
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const enabled = req.body?.enabled !== false && req.body?.enabled !== 'false'
  const doc = await Coupon.findByIdAndUpdate(
    id,
    { $set: { enabled, updatedBy: userIdOf(req) } },
    { new: true }
  ).lean()
  if (!doc) {
    const e = new Error('优惠券不存在')
    e.code = 404
    throw e
  }
  res.json({
    code: 0,
    message: 'success',
    data: { coupon: toCouponDto(doc) }
  })
}
