const mongoose = require('mongoose')
const SystemConfig = require('../models/SystemConfig')

/** 配置 key 常量 */
const CONFIG_KEYS = {
  PLATFORM_NAME: 'platform_name',
  COMPANY_NAME: 'company_name',
  COMPANY_ADDRESS: 'company_address',
  COMPANY_EMAIL: 'company_email',
  COMPANY_PHONE: 'company_phone',
  SUPPORT_PHONE: 'support_phone',
  SUPPORT_WECHAT: 'support_wechat',
  SUPPORT_WHATSAPP: 'support_whatsapp',
  SUPPORT_EMAIL: 'support_email',
  SUPPORT_TELEGRAM: 'support_telegram',
  ANNOUNCEMENT: 'announcement',
  PRIVACY_POLICY: 'privacy_policy',
  TERMS_OF_SERVICE: 'terms_of_service',
  COMPLAINT_POLICY: 'complaint_policy',
  MINIMUM_BOOKING_HOURS: 'minimum_booking_hours',
  MARKETING_ENABLED: 'marketing_enabled',
  PAYMENT_NOTICE: 'payment_notice',
  WECHAT_PAYMENT_MODE: 'wechat_payment_mode',
  ALIPAY_PAYMENT_MODE: 'alipay_payment_mode'
}

const DEFAULTS = {
  [CONFIG_KEYS.PLATFORM_NAME]: 'CNber',
  [CONFIG_KEYS.COMPANY_NAME]: 'CNber Technology Ltd',
  [CONFIG_KEYS.COMPANY_ADDRESS]: 'Belfast, UK',
  [CONFIG_KEYS.COMPANY_EMAIL]: 'support@cnber.co.uk',
  [CONFIG_KEYS.COMPANY_PHONE]: '',
  [CONFIG_KEYS.SUPPORT_PHONE]: '',
  [CONFIG_KEYS.SUPPORT_WECHAT]: '',
  [CONFIG_KEYS.SUPPORT_WHATSAPP]: '',
  [CONFIG_KEYS.SUPPORT_EMAIL]: 'support@cnber.co.uk',
  [CONFIG_KEYS.SUPPORT_TELEGRAM]: '',
  [CONFIG_KEYS.ANNOUNCEMENT]: '',
  [CONFIG_KEYS.PRIVACY_POLICY]: '',
  [CONFIG_KEYS.TERMS_OF_SERVICE]: '',
  [CONFIG_KEYS.COMPLAINT_POLICY]: '',
  [CONFIG_KEYS.MINIMUM_BOOKING_HOURS]: 24,
  [CONFIG_KEYS.MARKETING_ENABLED]: false,
  [CONFIG_KEYS.PAYMENT_NOTICE]:
    '请先完成微信或支付宝转账，付款备注填写订单号。提交付款人姓名、金额和流水号后，由后台人工核对到账。',
  [CONFIG_KEYS.WECHAT_PAYMENT_MODE]: 'manual_qr',
  [CONFIG_KEYS.ALIPAY_PAYMENT_MODE]: 'manual_qr'
}

const PLATFORM_KEYS = [
  CONFIG_KEYS.PLATFORM_NAME,
  CONFIG_KEYS.COMPANY_NAME,
  CONFIG_KEYS.COMPANY_ADDRESS,
  CONFIG_KEYS.COMPANY_EMAIL,
  CONFIG_KEYS.COMPANY_PHONE
]

const SUPPORT_KEYS = [
  CONFIG_KEYS.SUPPORT_PHONE,
  CONFIG_KEYS.SUPPORT_WECHAT,
  CONFIG_KEYS.SUPPORT_WHATSAPP,
  CONFIG_KEYS.SUPPORT_TELEGRAM,
  CONFIG_KEYS.SUPPORT_EMAIL
]

const ALL_CONFIG_KEYS = Object.values(CONFIG_KEYS)

function staffObjectId(req) {
  const raw = req?.user?.userId || req?.user?._id
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) return null
  return new mongoose.Types.ObjectId(String(raw))
}

function normalizeValue(key, value) {
  if (key === CONFIG_KEYS.MINIMUM_BOOKING_HOURS) {
    const n = parseInt(value, 10)
    if (!Number.isFinite(n) || n < 1) return DEFAULTS[CONFIG_KEYS.MINIMUM_BOOKING_HOURS]
    return n
  }
  if (key === CONFIG_KEYS.MARKETING_ENABLED) {
    if (value === true || value === 'true' || value === 1 || value === '1') return true
    return false
  }
  if (value == null) return DEFAULTS[key] ?? ''
  return String(value).trim()
}

async function getConfigMap(keys = ALL_CONFIG_KEYS) {
  const rows = await SystemConfig.find({ key: { $in: keys } }).lean()
  const map = { ...DEFAULTS }
  for (const row of rows) {
    if (keys.includes(row.key)) map[row.key] = row.value
  }
  for (const key of keys) {
    if (map[key] === undefined) map[key] = DEFAULTS[key]
  }
  return map
}

async function setConfigEntries(patch, req) {
  const updatedBy = staffObjectId(req)
  const now = new Date()
  const ops = []

  for (const [key, rawValue] of Object.entries(patch)) {
    if (!ALL_CONFIG_KEYS.includes(key)) continue
    const value = normalizeValue(key, rawValue)
    ops.push(
      SystemConfig.findOneAndUpdate(
        { key },
        { $set: { key, value, updatedBy, updatedAt: now } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  }
  await Promise.all(ops)
  return getConfigMap()
}

function toAdminPayload(map) {
  return {
    platform: {
      platformName: map[CONFIG_KEYS.PLATFORM_NAME] ?? '',
      companyName: map[CONFIG_KEYS.COMPANY_NAME] ?? '',
      companyAddress: map[CONFIG_KEYS.COMPANY_ADDRESS] ?? '',
      companyEmail: map[CONFIG_KEYS.COMPANY_EMAIL] ?? '',
      companyPhone: map[CONFIG_KEYS.COMPANY_PHONE] ?? ''
    },
    support: {
      supportPhone: map[CONFIG_KEYS.SUPPORT_PHONE] ?? '',
      supportWechat: map[CONFIG_KEYS.SUPPORT_WECHAT] ?? '',
      supportWhatsapp: map[CONFIG_KEYS.SUPPORT_WHATSAPP] ?? '',
      supportTelegram: map[CONFIG_KEYS.SUPPORT_TELEGRAM] ?? '',
      supportEmail: map[CONFIG_KEYS.SUPPORT_EMAIL] ?? ''
    },
    announcement: map[CONFIG_KEYS.ANNOUNCEMENT] ?? '',
    legal: {
      termsOfService: map[CONFIG_KEYS.TERMS_OF_SERVICE] ?? '',
      privacyPolicy: map[CONFIG_KEYS.PRIVACY_POLICY] ?? '',
      complaintPolicy: map[CONFIG_KEYS.COMPLAINT_POLICY] ?? ''
    },
    app: {
      minimumBookingHours: map[CONFIG_KEYS.MINIMUM_BOOKING_HOURS] ?? 24
    },
    marketing: {
      marketingEnabled: Boolean(map[CONFIG_KEYS.MARKETING_ENABLED])
    },
    /** 原始 KV，便于调试 */
    raw: map
  }
}

function toPublicPayload(map) {
  return {
    platformName: map[CONFIG_KEYS.PLATFORM_NAME] ?? DEFAULTS[CONFIG_KEYS.PLATFORM_NAME],
    supportPhone: map[CONFIG_KEYS.SUPPORT_PHONE] ?? '',
    supportWechat: map[CONFIG_KEYS.SUPPORT_WECHAT] ?? '',
    supportWhatsapp: map[CONFIG_KEYS.SUPPORT_WHATSAPP] ?? '',
    supportEmail: map[CONFIG_KEYS.SUPPORT_EMAIL] ?? '',
    announcement: map[CONFIG_KEYS.ANNOUNCEMENT] ?? '',
    minimumBookingHours: map[CONFIG_KEYS.MINIMUM_BOOKING_HOURS] ?? 24,
    marketingEnabled: Boolean(map[CONFIG_KEYS.MARKETING_ENABLED])
  }
}

/** 从 Admin PUT body 解析为 KV patch */
function bodyToPatch(body = {}) {
  const patch = {}
  const p = body.platform || {}
  if (p.platformName !== undefined) patch[CONFIG_KEYS.PLATFORM_NAME] = p.platformName
  if (p.companyName !== undefined) patch[CONFIG_KEYS.COMPANY_NAME] = p.companyName
  if (p.companyAddress !== undefined) patch[CONFIG_KEYS.COMPANY_ADDRESS] = p.companyAddress
  if (p.companyEmail !== undefined) patch[CONFIG_KEYS.COMPANY_EMAIL] = p.companyEmail
  if (p.companyPhone !== undefined) patch[CONFIG_KEYS.COMPANY_PHONE] = p.companyPhone

  const s = body.support || {}
  if (s.supportPhone !== undefined) patch[CONFIG_KEYS.SUPPORT_PHONE] = s.supportPhone
  if (s.supportWechat !== undefined) patch[CONFIG_KEYS.SUPPORT_WECHAT] = s.supportWechat
  if (s.supportWhatsapp !== undefined) patch[CONFIG_KEYS.SUPPORT_WHATSAPP] = s.supportWhatsapp
  if (s.supportTelegram !== undefined) patch[CONFIG_KEYS.SUPPORT_TELEGRAM] = s.supportTelegram
  if (s.supportEmail !== undefined) patch[CONFIG_KEYS.SUPPORT_EMAIL] = s.supportEmail

  if (body.announcement !== undefined) patch[CONFIG_KEYS.ANNOUNCEMENT] = body.announcement

  const l = body.legal || {}
  if (l.termsOfService !== undefined) patch[CONFIG_KEYS.TERMS_OF_SERVICE] = l.termsOfService
  if (l.privacyPolicy !== undefined) patch[CONFIG_KEYS.PRIVACY_POLICY] = l.privacyPolicy
  if (l.complaintPolicy !== undefined) patch[CONFIG_KEYS.COMPLAINT_POLICY] = l.complaintPolicy

  const a = body.app || {}
  if (a.minimumBookingHours !== undefined) {
    patch[CONFIG_KEYS.MINIMUM_BOOKING_HOURS] = a.minimumBookingHours
  }

  const m = body.marketing || {}
  if (m.marketingEnabled !== undefined) {
    patch[CONFIG_KEYS.MARKETING_ENABLED] = m.marketingEnabled
  }

  return patch
}

module.exports = {
  CONFIG_KEYS,
  DEFAULTS,
  PLATFORM_KEYS,
  SUPPORT_KEYS,
  ALL_CONFIG_KEYS,
  getConfigMap,
  setConfigEntries,
  toAdminPayload,
  toPublicPayload,
  bodyToPatch
}
