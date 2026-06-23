const mongoose = require('mongoose')
const CustomerProfile = require('../models/CustomerProfile')
const AIProfileInsight = require('../models/AIProfileInsight')
const SupportTicket = require('../models/SupportTicket')
const { getCrmPreset } = require('./crmAudiencePresets')

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function normalizeFilters(raw = {}) {
  const filters = { ...raw }
  if (filters.preset) {
    const preset = getCrmPreset(filters.preset)
    if (preset) {
      Object.assign(filters, { ...preset.filters, ...raw })
    }
  }
  if (filters.lastOrderAtBeforeDays != null) {
    const n = Number(filters.lastOrderAtBeforeDays)
    if (Number.isFinite(n) && n > 0) {
      filters.lastOrderAtBefore = daysAgo(n)
    }
    delete filters.lastOrderAtBeforeDays
  }
  if (typeof filters.aiTagsInclude === 'string') {
    filters.aiTagsInclude = filters.aiTagsInclude
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (!Array.isArray(filters.aiTagsInclude)) filters.aiTagsInclude = []
  return filters
}

function buildProfileQuery(filters) {
  const q = {}
  if (filters.totalOrdersMin != null) {
    q.totalOrders = { ...(q.totalOrders || {}), $gte: Number(filters.totalOrdersMin) }
  }
  if (filters.totalOrdersMax != null) {
    q.totalOrders = { ...(q.totalOrders || {}), $lte: Number(filters.totalOrdersMax) }
  }
  if (filters.totalSpentCnyMin != null) {
    q.totalSpentCny = { ...(q.totalSpentCny || {}), $gte: Number(filters.totalSpentCnyMin) }
  }
  if (filters.totalSpentCnyMax != null) {
    q.totalSpentCny = { ...(q.totalSpentCny || {}), $lte: Number(filters.totalSpentCnyMax) }
  }
  if (filters.lastOrderAtAfter) {
    const d = new Date(filters.lastOrderAtAfter)
    if (!Number.isNaN(d.getTime())) {
      q.lastOrderAt = { ...(q.lastOrderAt || {}), $gte: d }
    }
  }
  if (filters.lastOrderAtBefore) {
    const d = new Date(filters.lastOrderAtBefore)
    if (!Number.isNaN(d.getTime())) {
      q.$or = [
        { lastOrderAt: { ...(q.lastOrderAt || {}), $lt: d } },
        { lastOrderAt: null }
      ]
      delete q.lastOrderAt
    }
  }
  if (filters.favoriteServiceType) {
    q.favoriteServiceType = String(filters.favoriteServiceType).trim()
  }
  if (filters.marketingConsent === true || filters.marketingConsent === false) {
    q.marketingConsent = filters.marketingConsent
  }
  if (filters.customerType) {
    q.customerType = String(filters.customerType).trim()
  }
  return q
}

async function latestAiTagsByProfileIds(profileIds) {
  if (!profileIds.length) return new Map()
  const insights = await AIProfileInsight.aggregate([
    {
      $match: {
        profileType: 'customer',
        profileId: { $in: profileIds.map((id) => new mongoose.Types.ObjectId(String(id))) }
      }
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$profileId',
        tags: { $first: '$tags' }
      }
    }
  ])
  const map = new Map()
  for (const row of insights) {
    map.set(String(row._id), row.tags || [])
  }
  return map
}

async function complaintUserIds() {
  const rows = await SupportTicket.distinct('requesterUserId', {
    type: 'complaint',
    requesterUserId: { $ne: null }
  })
  return new Set(rows.map((id) => String(id)))
}

function matchesAiTags(insightTags, required) {
  if (!required?.length) return true
  const set = new Set(insightTags || [])
  return required.every((t) => set.has(t))
}

/**
 * 根据筛选条件解析客户画像 ID 列表（不修改任何客户数据）
 */
async function resolveAudienceCustomerIds(rawFilters = {}) {
  const filters = normalizeFilters(rawFilters)
  const q = buildProfileQuery(filters)
  let profiles = await CustomerProfile.find(q).select('_id userId').lean()

  if (filters.aiTagsInclude?.length) {
    const tagMap = await latestAiTagsByProfileIds(profiles.map((p) => p._id))
    profiles = profiles.filter((p) => matchesAiTags(tagMap.get(String(p._id)), filters.aiTagsInclude))
  }

  if (filters.hasComplaint === true) {
    const complained = await complaintUserIds()
    profiles = profiles.filter((p) => complained.has(String(p.userId)))
  } else if (filters.hasComplaint === false) {
    const complained = await complaintUserIds()
    profiles = profiles.filter((p) => !complained.has(String(p.userId)))
  }

  return {
    filters,
    customerIds: profiles.map((p) => p._id)
  }
}

async function enrichAudienceCustomers(customerIds) {
  if (!customerIds?.length) return []
  const profiles = await CustomerProfile.find({ _id: { $in: customerIds } })
    .sort({ lastOrderAt: -1, updatedAt: -1 })
    .lean()
  const tagMap = await latestAiTagsByProfileIds(profiles.map((p) => p._id))
  return profiles.map((p) => ({
    _id: p._id,
    userId: p.userId,
    name: p.name || '',
    phone: p.phone || '',
    customerType: p.customerType || 'unknown',
    totalOrders: p.totalOrders ?? 0,
    totalSpentCny: p.totalSpentCny ?? 0,
    tags: p.tags || [],
    aiTags: tagMap.get(String(p._id)) || [],
    lastOrderAt: p.lastOrderAt || null,
    marketingConsent: Boolean(p.marketingConsent),
    favoriteServiceType: p.favoriteServiceType || ''
  }))
}

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function buildAudienceCsv(customers, audienceName) {
  const header = [
    'phone',
    'displayName',
    'customerType',
    'totalOrders',
    'totalSpentCny',
    'tags',
    'aiTags',
    'lastOrderAt',
    'marketingConsent'
  ]
  const lines = [header.join(',')]
  for (const c of customers) {
    lines.push(
      [
        csvEscape(c.phone),
        csvEscape(c.name),
        csvEscape(c.customerType),
        csvEscape(c.totalOrders),
        csvEscape(c.totalSpentCny),
        csvEscape((c.tags || []).join('|')),
        csvEscape((c.aiTags || []).join('|')),
        csvEscape(c.lastOrderAt ? new Date(c.lastOrderAt).toISOString() : ''),
        csvEscape(c.marketingConsent ? 'true' : 'false')
      ].join(',')
    )
  }
  const slug = String(audienceName || 'audience')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  return {
    filename: `crm_audience_${slug || 'export'}.csv`,
    content: '\uFEFF' + lines.join('\n')
  }
}

module.exports = {
  normalizeFilters,
  resolveAudienceCustomerIds,
  enrichAudienceCustomers,
  buildAudienceCsv
}
