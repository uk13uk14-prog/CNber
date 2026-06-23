const mongoose = require('mongoose')
const MarketingAudience = require('../models/MarketingAudience')
const MarketingLog = require('../models/MarketingLog')
const { ACTIONS: MARKETING_LOG_ACTIONS } = require('../models/MarketingLog')
const { listCrmPresets } = require('../utils/crmAudiencePresets')
const {
  normalizeFilters,
  resolveAudienceCustomerIds,
  enrichAudienceCustomers,
  buildAudienceCsv
} = require('../utils/crmAudienceResolver')

function requireAdmin(req) {
  if (req.user?.role !== 'admin') {
    const e = new Error('仅管理员可创建或刷新营销名单')
    e.code = 403
    throw e
  }
}

function assertValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
}

function createdByFromReq(req) {
  return {
    userId: req.user?.userId || null,
    phone: String(req.user?.phone || '').trim(),
    displayName: String(req.user?.displayName || req.user?.phone || '').trim()
  }
}

function operatorFromReq(req) {
  return {
    operatorId: req.user?.userId || null,
    operatorPhone: String(req.user?.phone || '').trim()
  }
}

function actionLabel(action) {
  const map = {
    export_csv: '导出 CSV',
    manual_contact: '人工联系',
    note: '备注'
  }
  return map[action] || action
}

function toMarketingLogDto(row) {
  return {
    ...row,
    actionLabel: actionLabel(row.action)
  }
}

function createdByLabel(row) {
  const cb = row?.createdBy || {}
  return cb.displayName || cb.phone || '—'
}

async function applyResolvedAudience(doc) {
  const { filters, customerIds } = await resolveAudienceCustomerIds(doc.filters)
  doc.filters = filters
  doc.customerIds = customerIds
  doc.count = customerIds.length
  await doc.save()
  return doc
}

/** GET /admin/crm/audiences */
exports.listAudiences = async (req, res) => {
  const rows = await MarketingAudience.find()
    .sort({ createdAt: -1 })
    .lean()
  res.json({
    code: 0,
    message: 'success',
    data: {
      rows: rows.map((r) => ({
        ...r,
        createdByLabel: createdByLabel(r)
      })),
      presets: listCrmPresets()
    }
  })
}

/** POST /admin/crm/audiences */
exports.createAudience = async (req, res) => {
  requireAdmin(req)
  const body = req.body || {}
  const name = String(body.name || '').trim()
  if (!name) {
    const e = new Error('名单名称必填')
    e.code = 400
    throw e
  }
  const filters = normalizeFilters(body.filters || {})
  const doc = await MarketingAudience.create({
    name,
    description: String(body.description || '').trim(),
    filters,
    customerIds: [],
    count: 0,
    createdBy: createdByFromReq(req)
  })
  await applyResolvedAudience(doc)
  const row = doc.toObject()
  res.json({
    code: 0,
    message: 'success',
    data: { ...row, createdByLabel: createdByLabel(row) }
  })
}

/** GET /admin/crm/audiences/:id */
exports.getAudience = async (req, res) => {
  assertValidId(req.params.id)
  const row = await MarketingAudience.findById(req.params.id).lean()
  if (!row) {
    const e = new Error('营销名单不存在')
    e.code = 404
    throw e
  }
  const customers = await enrichAudienceCustomers(row.customerIds || [])
  res.json({
    code: 0,
    message: 'success',
    data: {
      ...row,
      createdByLabel: createdByLabel(row),
      customers
    }
  })
}

/** POST /admin/crm/audiences/:id/refresh */
exports.refreshAudience = async (req, res) => {
  requireAdmin(req)
  assertValidId(req.params.id)
  const doc = await MarketingAudience.findById(req.params.id)
  if (!doc) {
    const e = new Error('营销名单不存在')
    e.code = 404
    throw e
  }
  await applyResolvedAudience(doc)
  const customers = await enrichAudienceCustomers(doc.customerIds || [])
  const row = doc.toObject()
  res.json({
    code: 0,
    message: 'success',
    data: {
      ...row,
      createdByLabel: createdByLabel(row),
      customers
    }
  })
}

/** GET /admin/crm/audiences/:id/export */
exports.exportAudience = async (req, res) => {
  assertValidId(req.params.id)
  const row = await MarketingAudience.findById(req.params.id).lean()
  if (!row) {
    const e = new Error('营销名单不存在')
    e.code = 404
    throw e
  }
  const customers = await enrichAudienceCustomers(row.customerIds || [])
  const { filename, content } = buildAudienceCsv(customers, row.name)

  await MarketingLog.create({
    audienceId: row._id,
    audienceName: row.name || '',
    action: 'export_csv',
    customerCount: customers.length,
    remark: `导出 ${customers.length} 人`,
    ...operatorFromReq(req)
  })

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(content)
}

/** GET /admin/crm/marketing-logs */
exports.listMarketingLogs = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const query = {}
  const audienceId = String(req.query.audienceId || '').trim()
  if (audienceId && mongoose.Types.ObjectId.isValid(audienceId)) {
    query.audienceId = audienceId
  }

  const [items, total] = await Promise.all([
    MarketingLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    MarketingLog.countDocuments(query)
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      logs: items.map(toMarketingLogDto),
      total,
      page,
      pageSize
    }
  })
}

/** POST /admin/crm/marketing-logs */
exports.createMarketingLog = async (req, res) => {
  const body = req.body || {}
  const action = String(body.action || 'note').trim()
  if (!MARKETING_LOG_ACTIONS.includes(action)) {
    const e = new Error('操作类型无效')
    e.code = 400
    throw e
  }

  const audienceId = body.audienceId || null
  if (!audienceId || !mongoose.Types.ObjectId.isValid(String(audienceId))) {
    const e = new Error('audienceId 无效')
    e.code = 400
    throw e
  }

  const audience = await MarketingAudience.findById(audienceId).select('name count').lean()
  if (!audience) {
    const e = new Error('营销名单不存在')
    e.code = 404
    throw e
  }

  const doc = await MarketingLog.create({
    audienceId: audience._id,
    audienceName: audience.name || '',
    action,
    customerCount: audience.count ?? 0,
    remark: String(body.remark || '').trim(),
    ...operatorFromReq(req)
  })

  res.status(201).json({
    code: 0,
    message: 'success',
    data: { log: toMarketingLogDto(doc.toObject()) }
  })
}
