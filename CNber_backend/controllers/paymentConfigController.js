const PaymentAccount = require('../models/PaymentAccount')
const { normalizeLegacyAccount } = require('../models/PaymentAccount')
const { toStoredPaymentAssetPath, publicHttpLink } = require('../utils/paymentAssetUrl')
const { savePaymentQrImage } = require('../utils/paymentQrUpload')
const { CONFIG_KEYS, getConfigMap, setConfigEntries } = require('../utils/systemConfig')
const { normalizePaymentMode } = require('../utils/paymentModes')
const { auditLog } = require('../utils/auditLog')

const DEFAULT_NOTICE =
  '请先完成微信或支付宝转账，付款备注填写订单号。提交付款人姓名、金额和流水号后，由后台人工核对到账。'

function qrFieldsForType(type, rel) {
  if (type === 'alipay') {
    return {
      qrCodeUrl: rel,
      qrImage: rel,
      alipayQrImage: rel
    }
  }
  return {
    qrCodeUrl: rel,
    qrImage: rel,
    wechatQrImage: rel
  }
}

function pickQrRaw(doc, type) {
  if (!doc) return ''
  if (type === 'alipay') {
    return doc.alipayQrImage || doc.qrImage || doc.qrCodeUrl || ''
  }
  return doc.wechatQrImage || doc.qrImage || doc.qrCodeUrl || ''
}

async function findChannelAccount(type) {
  return PaymentAccount.findOne({
    $or: [{ paymentType: type }, { method: type }]
  }).sort({ sortOrder: 1, createdAt: 1 })
}

async function persistRelativeUrls(doc, type) {
  if (!doc) return doc
  const patch = {}
  for (const k of ['qrCodeUrl', 'qrImage', 'wechatQrImage', 'alipayQrImage']) {
    const raw = doc[k]
    if (!raw) continue
    const rel = toStoredPaymentAssetPath(raw)
    if (rel && rel !== raw) patch[k] = rel
  }
  const link = publicHttpLink(doc.paymentLink)
  if (doc.paymentLink && !link) patch.paymentLink = ''
  if (!Object.keys(patch).length) return doc
  const updated = await PaymentAccount.findByIdAndUpdate(doc._id, { $set: patch }, { new: true })
  return updated || doc
}

function channelPayload(type, doc, paymentMode) {
  const mode = normalizePaymentMode(type, paymentMode)
  if (!doc) {
    return {
      enabled: false,
      qrUrl: '',
      paymentAccountId: null,
      accountName: '',
      paymentMode: mode
    }
  }
  const row = normalizeLegacyAccount(doc.toObject ? doc.toObject() : doc)
  return {
    enabled: row.enabled !== false && row.isActive !== false,
    qrUrl: toStoredPaymentAssetPath(pickQrRaw(row, type)),
    paymentAccountId: String(row._id),
    accountName: row.accountName || row.displayName || '',
    paymentMode: mode
  }
}

async function buildPaymentConfig() {
  let [wechatDoc, alipayDoc, map] = await Promise.all([
    findChannelAccount('wechat'),
    findChannelAccount('alipay'),
    getConfigMap([
      CONFIG_KEYS.PAYMENT_NOTICE,
      CONFIG_KEYS.WECHAT_PAYMENT_MODE,
      CONFIG_KEYS.ALIPAY_PAYMENT_MODE
    ])
  ])
  wechatDoc = await persistRelativeUrls(wechatDoc, 'wechat')
  alipayDoc = await persistRelativeUrls(alipayDoc, 'alipay')
  const notice = map[CONFIG_KEYS.PAYMENT_NOTICE]
  return {
    currency: 'CNY',
    wechat: channelPayload('wechat', wechatDoc, map[CONFIG_KEYS.WECHAT_PAYMENT_MODE]),
    alipay: channelPayload('alipay', alipayDoc, map[CONFIG_KEYS.ALIPAY_PAYMENT_MODE]),
    paymentNotice: notice == null || notice === '' ? DEFAULT_NOTICE : String(notice)
  }
}

async function upsertChannelAccount(type, extra = {}) {
  let doc = await findChannelAccount(type)
  const displayName = type === 'alipay' ? 'CNber 支付宝收款' : 'CNber 微信收款'
  const base = {
    method: type,
    paymentType: type,
    displayName: doc?.displayName || displayName,
    accountName: doc?.accountName || 'CNber',
    enabled: extra.enabled !== undefined ? extra.enabled : doc ? doc.enabled !== false : true,
    isActive: extra.enabled !== undefined ? extra.enabled : doc ? doc.isActive !== false : true,
    sortOrder: type === 'alipay' ? 2 : 1,
    ...extra.fields
  }
  if (doc) {
    doc.set(base)
    await doc.save()
    return doc
  }
  return PaymentAccount.create(base)
}

/** GET /api/payment/config — 公开，Client 支付页每次打开读取 */
exports.getPublicPaymentConfig = async (_req, res) => {
  const data = await buildPaymentConfig()
  res.json({ code: 0, message: 'success', data })
}

/** GET /api/admin/payment-config */
exports.getAdminPaymentConfig = async (_req, res) => {
  const data = await buildPaymentConfig()
  res.json({ code: 0, message: 'success', data })
}

/** PUT /api/admin/payment-config */
exports.putAdminPaymentConfig = async (req, res) => {
  const body = req.body || {}
  if (body.wechat && body.wechat.enabled !== undefined) {
    await upsertChannelAccount('wechat', { enabled: Boolean(body.wechat.enabled) })
  }
  if (body.alipay && body.alipay.enabled !== undefined) {
    await upsertChannelAccount('alipay', { enabled: Boolean(body.alipay.enabled) })
  }
  const modePatch = {}
  if (body.paymentNotice !== undefined) {
    modePatch[CONFIG_KEYS.PAYMENT_NOTICE] = String(body.paymentNotice || '')
  }
  if (body.wechat && body.wechat.paymentMode !== undefined) {
    modePatch[CONFIG_KEYS.WECHAT_PAYMENT_MODE] = normalizePaymentMode(
      'wechat',
      body.wechat.paymentMode
    )
  }
  if (body.alipay && body.alipay.paymentMode !== undefined) {
    modePatch[CONFIG_KEYS.ALIPAY_PAYMENT_MODE] = normalizePaymentMode(
      'alipay',
      body.alipay.paymentMode
    )
  }
  if (Object.keys(modePatch).length) {
    await setConfigEntries(modePatch, req)
  }
  const data = await buildPaymentConfig()
  void auditLog(req, {
    action: '更新支付设置',
    module: 'system_settings',
    entityType: 'payment_config',
    description: '更新微信/支付宝启用状态或付款说明'
  })
  res.json({ code: 0, message: 'success', data })
}

/** POST /api/admin/payment-config/qr */
exports.uploadPaymentQr = async (req, res) => {
  const body = req.body || {}
  const type = body.type === 'alipay' ? 'alipay' : body.type === 'wechat' ? 'wechat' : ''
  if (!type) {
    const e = new Error('type 必须为 wechat 或 alipay')
    e.code = 400
    throw e
  }
  const image = body.imageBase64 || body.image || body.file
  const saved = savePaymentQrImage(image, type)
  await upsertChannelAccount(type, { fields: qrFieldsForType(type, saved.relativeUrl) })
  const data = await buildPaymentConfig()
  void auditLog(req, {
    action: '上传收款码',
    module: 'system_settings',
    entityType: 'payment_config',
    description: `上传${type === 'alipay' ? '支付宝' : '微信'}收款码 ${saved.relativeUrl}`
  })
  res.json({
    code: 0,
    message: 'success',
    data: {
      ...data,
      uploaded: { type, qrUrl: saved.relativeUrl }
    }
  })
}

exports.buildPaymentConfig = buildPaymentConfig
exports.DEFAULT_NOTICE = DEFAULT_NOTICE
