const mongoose = require('mongoose')
const Campaign = require('../models/Campaign')
const Coupon = require('../models/Coupon')
const {
  normalizeCouponCode,
  getCampaignStatus,
  getCampaignStatusLabel,
  CAMPAIGN_STATUS
} = require('../utils/couponEngine')

function requireAdmin(req) {
  if (req.user?.role !== 'admin') {
    const e = new Error('仅管理员可修改活动')
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
    return raw.split(',').map((x) => x.trim()).filter(Boolean)
  }
  return []
}

async function resolveLinkedCoupon(body) {
  let linkedCouponId = body.linkedCouponId || null
  let linkedCouponCode = normalizeCouponCode(body.linkedCouponCode || '')
  if (linkedCouponId) {
    if (!mongoose.Types.ObjectId.isValid(linkedCouponId)) {
      const e = new Error('关联优惠券 ID 无效')
      e.code = 400
      throw e
    }
    const coupon = await Coupon.findById(linkedCouponId).lean()
    if (!coupon) {
      const e = new Error('关联优惠券不存在')
      e.code = 400
      throw e
    }
    linkedCouponCode = coupon.code
    linkedCouponId = coupon._id
  } else if (linkedCouponCode) {
    const coupon = await Coupon.findOne({ code: linkedCouponCode }).lean()
    if (coupon) {
      linkedCouponId = coupon._id
      linkedCouponCode = coupon.code
    }
  } else {
    linkedCouponId = null
    linkedCouponCode = ''
  }
  return { linkedCouponId, linkedCouponCode }
}

function pickCampaignBody(body) {
  const title = String(body.title || '').trim()
  const subtitle = String(body.subtitle ?? '').trim()
  const description = String(body.description ?? '').trim()
  const bannerUrl = String(body.bannerUrl ?? '').trim()
  const targetServiceTypes = parseStringArray(body.targetServiceTypes)
  const startAt = parseDate(body.startAt, '开始时间')
  const endAt = parseDate(body.endAt, '结束时间')
  const enabled = body.enabled !== false
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
  const remark = String(body.remark ?? '').trim()

  if (!title) {
    const e = new Error('活动标题必填')
    e.code = 400
    throw e
  }
  if (endAt <= startAt) {
    const e = new Error('结束时间须晚于开始时间')
    e.code = 400
    throw e
  }

  return {
    title,
    subtitle,
    description,
    bannerUrl,
    targetServiceTypes,
    startAt,
    endAt,
    enabled,
    sortOrder,
    remark
  }
}

function toCampaignDto(doc, now = new Date()) {
  const row = doc?.toObject ? doc.toObject() : { ...doc }
  const status = getCampaignStatus(row, now)
  return {
    ...row,
    status,
    statusLabel: getCampaignStatusLabel(row, now)
  }
}

function buildListQuery(query = {}) {
  const q = {}
  const keyword = String(query.keyword || '').trim()
  if (keyword) {
    const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    q.$or = [{ title: re }, { subtitle: re }, { linkedCouponCode: re }]
  }
  if (query.enabled === 'true' || query.enabled === '1') q.enabled = true
  if (query.enabled === 'false' || query.enabled === '0') q.enabled = false
  return q
}

function matchesStatusFilter(row, statusFilter, now) {
  if (!statusFilter) return true
  return getCampaignStatus(row, now) === statusFilter
}

exports.listCampaigns = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const statusFilter = String(req.query.status || '').trim()
  const now = new Date()
  const baseQuery = buildListQuery(req.query)

  let items
  let total
  if (statusFilter && Object.values(CAMPAIGN_STATUS).includes(statusFilter)) {
    const all = await Campaign.find(baseQuery).sort({ sortOrder: 1, createdAt: -1 }).lean()
    const filtered = all.filter((row) => matchesStatusFilter(row, statusFilter, now))
    total = filtered.length
    items = filtered.slice((page - 1) * pageSize, page * pageSize)
  } else {
    total = await Campaign.countDocuments(baseQuery)
    items = await Campaign.find(baseQuery)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()
  }

  res.json({
    code: 0,
    message: 'success',
    data: {
      campaigns: items.map((row) => toCampaignDto(row, now)),
      total,
      page,
      pageSize
    }
  })
}

exports.getCampaign = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const doc = await Campaign.findById(id).lean()
  if (!doc) {
    const e = new Error('活动不存在')
    e.code = 404
    throw e
  }
  res.json({
    code: 0,
    message: 'success',
    data: { campaign: toCampaignDto(doc) }
  })
}

exports.createCampaign = async (req, res) => {
  requireAdmin(req)
  const fields = pickCampaignBody(req.body)
  const linked = await resolveLinkedCoupon(req.body)
  const doc = await Campaign.create({
    ...fields,
    ...linked,
    createdBy: userIdOf(req),
    updatedBy: userIdOf(req)
  })
  res.status(201).json({
    code: 0,
    message: 'success',
    data: { campaign: toCampaignDto(doc.toObject()) }
  })
}

exports.updateCampaign = async (req, res) => {
  requireAdmin(req)
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const fields = pickCampaignBody(req.body)
  const linked = await resolveLinkedCoupon(req.body)
  const doc = await Campaign.findByIdAndUpdate(
    id,
    { $set: { ...fields, ...linked, updatedBy: userIdOf(req) } },
    { new: true, runValidators: true }
  ).lean()
  if (!doc) {
    const e = new Error('活动不存在')
    e.code = 404
    throw e
  }
  res.json({
    code: 0,
    message: 'success',
    data: { campaign: toCampaignDto(doc) }
  })
}

exports.patchCampaignStatus = async (req, res) => {
  requireAdmin(req)
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const enabled = req.body?.enabled !== false && req.body?.enabled !== 'false'
  const doc = await Campaign.findByIdAndUpdate(
    id,
    { $set: { enabled, updatedBy: userIdOf(req) } },
    { new: true }
  ).lean()
  if (!doc) {
    const e = new Error('活动不存在')
    e.code = 404
    throw e
  }
  res.json({
    code: 0,
    message: 'success',
    data: { campaign: toCampaignDto(doc) }
  })
}

/** GET /api/public/campaigns */
exports.listPublicCampaigns = async (_req, res) => {
  const now = new Date()
  const items = await Campaign.find({
    enabled: true,
    startAt: { $lte: now },
    endAt: { $gte: now }
  })
    .sort({ sortOrder: 1, startAt: -1 })
    .lean()

  res.json({
    code: 0,
    message: 'success',
    data: {
      campaigns: items.map((row) => ({
        _id: row._id,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        bannerUrl: row.bannerUrl,
        linkedCouponId: row.linkedCouponId,
        linkedCouponCode: row.linkedCouponCode,
        targetServiceTypes: row.targetServiceTypes || [],
        startAt: row.startAt,
        endAt: row.endAt,
        sortOrder: row.sortOrder ?? 0
      }))
    }
  })
}
