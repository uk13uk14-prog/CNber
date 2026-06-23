const mongoose = require('mongoose')
const CustomerProfile = require('../models/CustomerProfile')
const DriverProfile = require('../models/DriverProfile')
const AIProfileInsight = require('../models/AIProfileInsight')
const { CUSTOMER_TYPES } = require('../models/CustomerProfile')
const {
  generateCustomerInsight,
  generateDriverInsight
} = require('../utils/aiProfileInsightEngine')

function assertValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
}

function parsePage(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function latestInsight(profileType, profileId) {
  return AIProfileInsight.findOne({ profileType, profileId })
    .sort({ createdAt: -1 })
    .lean()
}

async function saveInsight(profileType, profileId, payload) {
  const doc = await AIProfileInsight.create({
    profileType,
    profileId,
    summary: payload.summary,
    tags: payload.tags,
    riskLevel: payload.riskLevel,
    recommendations: payload.recommendations,
    version: payload.version
  })
  return doc.toObject()
}

function insightToSummaryText(insight) {
  if (!insight) return ''
  const lines = [
    insight.summary,
    insight.tags?.length ? `标签：${insight.tags.join('、')}` : '',
    insight.riskLevel && insight.riskLevel !== 'none' ? `风险：${insight.riskLevel}` : '',
    insight.recommendations?.length ? `推荐：${insight.recommendations.join('；')}` : ''
  ].filter(Boolean)
  return lines.join('\n')
}

/** GET /admin/profiles/customers */
exports.listCustomerProfiles = async (req, res) => {
  const { page, pageSize, skip } = parsePage(req.query)
  const q = {}
  const search = String(req.query.search || req.query.q || '').trim()
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i')
    q.$or = [{ phone: re }, { name: re }, { email: re }]
  }
  const tag = String(req.query.tag || '').trim()
  if (tag) q.tags = tag
  if (req.query.marketingConsent === 'true') q.marketingConsent = true
  if (req.query.marketingConsent === 'false') q.marketingConsent = false

  const [rows, total] = await Promise.all([
    CustomerProfile.find(q).sort({ lastOrderAt: -1, updatedAt: -1 }).skip(skip).limit(pageSize).lean(),
    CustomerProfile.countDocuments(q)
  ])

  res.json({
    code: 0,
    message: 'success',
    data: { rows, total, page, pageSize }
  })
}

/** GET /admin/profiles/customers/:id */
exports.getCustomerProfile = async (req, res) => {
  assertValidId(req.params.id)
  const row =
    (await CustomerProfile.findById(req.params.id).lean()) ||
    (await CustomerProfile.findOne({ userId: req.params.id }).lean())
  if (!row) {
    const e = new Error('客户画像不存在')
    e.code = 404
    throw e
  }
  const aiInsight = await latestInsight('customer', row._id)
  res.json({ code: 0, message: 'success', data: { ...row, aiInsight: aiInsight || null } })
}

/** PATCH /admin/profiles/customers/:id — 备注、标签、客户类型可编辑 */
exports.patchCustomerProfile = async (req, res) => {
  assertValidId(req.params.id)
  const body = req.body || {}
  const patch = {}

  if (body.notes !== undefined) patch.notes = String(body.notes || '').trim()
  if (body.tags !== undefined) {
    patch.tags = Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim()).filter(Boolean)
      : []
  }
  if (body.customerType !== undefined) {
    const ct = String(body.customerType || 'unknown')
    if (!CUSTOMER_TYPES.includes(ct)) {
      const e = new Error('customerType 无效')
      e.code = 400
      throw e
    }
    patch.customerType = ct
  }
  if (body.marketingConsent !== undefined) {
    const consent = Boolean(body.marketingConsent)
    patch.marketingConsent = consent
    if (consent) {
      patch.marketingConsentAt = new Date()
      patch.marketingOptOutAt = null
    } else {
      patch.marketingOptOutAt = new Date()
    }
  }

  if (!Object.keys(patch).length) {
    const e = new Error('无可更新字段')
    e.code = 400
    throw e
  }

  const row = await CustomerProfile.findOneAndUpdate(
    { $or: [{ _id: req.params.id }, { userId: req.params.id }] },
    { $set: patch },
    { new: true }
  ).lean()

  if (!row) {
    const e = new Error('客户画像不存在')
    e.code = 404
    throw e
  }

  res.json({ code: 0, message: 'success', data: row })
}

/** POST /admin/profiles/customers/:id/ai-summary — 规则引擎 AI 洞察（V1 手动生成） */
exports.generateCustomerAiSummary = async (req, res) => {
  assertValidId(req.params.id)
  const row =
    (await CustomerProfile.findById(req.params.id)) ||
    (await CustomerProfile.findOne({ userId: req.params.id }))
  if (!row) {
    const e = new Error('客户画像不存在')
    e.code = 404
    throw e
  }

  const payload = await generateCustomerInsight(row.toObject())
  const aiInsight = await saveInsight('customer', row._id, payload)

  row.aiProfileSummary = insightToSummaryText(aiInsight)
  row.aiLastAnalyzedAt = new Date()
  await row.save()

  res.json({
    code: 0,
    message: 'success',
    data: { ...row.toObject(), aiInsight }
  })
}

/** GET /admin/profiles/drivers */
exports.listDriverProfiles = async (req, res) => {
  const { page, pageSize, skip } = parsePage(req.query)
  const q = {}
  const search = String(req.query.search || req.query.q || '').trim()
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i')
    q.$or = [{ phone: re }, { name: re }, { carPlate: re }]
  }
  const vehicleClass = String(req.query.vehicleClass || '').trim()
  if (vehicleClass) q.vehicleClass = vehicleClass
  const area = String(req.query.serviceArea || '').trim()
  if (area) q.serviceArea = area
  const tag = String(req.query.tag || '').trim()
  if (tag) q.tags = tag

  const [rows, total] = await Promise.all([
    DriverProfile.find(q).sort({ completedOrders: -1, updatedAt: -1 }).skip(skip).limit(pageSize).lean(),
    DriverProfile.countDocuments(q)
  ])

  res.json({
    code: 0,
    message: 'success',
    data: { rows, total, page, pageSize }
  })
}

/** GET /admin/profiles/drivers/:id */
exports.getDriverProfile = async (req, res) => {
  assertValidId(req.params.id)
  const row =
    (await DriverProfile.findById(req.params.id).lean()) ||
    (await DriverProfile.findOne({ userId: req.params.id }).lean()) ||
    (await DriverProfile.findOne({ driverId: req.params.id }).lean())
  if (!row) {
    const e = new Error('司机画像不存在')
    e.code = 404
    throw e
  }
  const aiInsight = await latestInsight('driver', row._id)
  res.json({ code: 0, message: 'success', data: { ...row, aiInsight: aiInsight || null } })
}

/** PATCH /admin/profiles/drivers/:id */
exports.patchDriverProfile = async (req, res) => {
  assertValidId(req.params.id)
  const body = req.body || {}
  const patch = {}

  if (body.notes !== undefined) patch.notes = String(body.notes || '').trim()
  if (body.availabilityNotes !== undefined) {
    patch.availabilityNotes = String(body.availabilityNotes || '').trim()
  }
  if (body.tags !== undefined) {
    patch.tags = Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim()).filter(Boolean)
      : []
  }
  if (body.riskFlags !== undefined) {
    patch.riskFlags = Array.isArray(body.riskFlags)
      ? body.riskFlags.map((t) => String(t).trim()).filter(Boolean)
      : []
  }

  if (!Object.keys(patch).length) {
    const e = new Error('无可更新字段')
    e.code = 400
    throw e
  }

  const row = await DriverProfile.findOneAndUpdate(
    { $or: [{ _id: req.params.id }, { userId: req.params.id }, { driverId: req.params.id }] },
    { $set: patch },
    { new: true }
  ).lean()

  if (!row) {
    const e = new Error('司机画像不存在')
    e.code = 404
    throw e
  }

  res.json({ code: 0, message: 'success', data: row })
}

/** POST /admin/profiles/drivers/:id/ai-summary — 规则引擎 AI 洞察（V1 手动生成） */
exports.generateDriverAiSummary = async (req, res) => {
  assertValidId(req.params.id)
  const row =
    (await DriverProfile.findById(req.params.id)) ||
    (await DriverProfile.findOne({ userId: req.params.id })) ||
    (await DriverProfile.findOne({ driverId: req.params.id }))
  if (!row) {
    const e = new Error('司机画像不存在')
    e.code = 404
    throw e
  }

  const payload = await generateDriverInsight(row.toObject())
  const aiInsight = await saveInsight('driver', row._id, payload)

  row.aiProfileSummary = insightToSummaryText(aiInsight)
  row.aiLastAnalyzedAt = new Date()
  await row.save()

  res.json({
    code: 0,
    message: 'success',
    data: { ...row.toObject(), aiInsight }
  })
}
