const mongoose = require('mongoose')
const PaymentAccount = require('../models/PaymentAccount')
const { normalizeLegacyAccount } = require('../models/PaymentAccount')

function pickBody(body = {}) {
  const paymentType = body.paymentType || body.method || body.type || 'other'
  const displayName = String(body.displayName || body.name || '').trim()
  const accountNumber = String(body.accountNumber || body.accountNo || '').trim()
  const qrImage = String(body.qrImage || body.qrCodeUrl || '').trim()
  const note = String(body.note || body.instructions || body.instruction || '').trim()
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : body.enabled !== false
  const alipayUrlInput = String(body.alipayUrl || '').trim()
  const paymentLinkInput = String(body.paymentLink || '').trim()
  const paymentLink = alipayUrlInput || paymentLinkInput

  return {
    method: paymentType,
    paymentType,
    displayName,
    accountName: String(body.accountName || body.receiverName || '').trim(),
    bankName: String(body.bankName || '').trim(),
    accountNo: accountNumber,
    accountNumber,
    sortCode: String(body.sortCode || '').trim(),
    iban: String(body.iban || '').trim(),
    wiseLink: String(body.wiseLink || '').trim(),
    revolutLink: String(body.revolutLink || '').trim(),
    paymentLink,
    qrCodeUrl: qrImage,
    qrImage,
    wechatQrImage: String(body.wechatQrImage || '').trim(),
    alipayQrImage: String(body.alipayQrImage || '').trim(),
    customerServiceWechat: String(body.customerServiceWechat || '').trim(),
    customerServiceWhatsapp: String(body.customerServiceWhatsapp || '').trim(),
    instructions: note,
    note,
    enabled: isActive,
    isActive,
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
  }
}

function toPublicAccount(doc) {
  const a = normalizeLegacyAccount(doc)
  const pt = a.paymentType || a.method || 'other'
  const qr =
    a.wechatQrImage ||
    a.alipayQrImage ||
    a.qrImage ||
    a.qrCodeUrl ||
    ''
  return {
    _id: a._id,
    paymentType: pt,
    method: pt,
    displayName: a.displayName || '',
    accountName: a.accountName || '',
    bankName: a.bankName || '',
    sortCode: a.sortCode || '',
    accountNumber: a.accountNumber || a.accountNo || '',
    accountNo: a.accountNumber || a.accountNo || '',
    iban: a.iban || '',
    wiseLink: a.wiseLink || '',
    revolutLink: a.revolutLink || '',
    paymentLink: a.paymentLink || '',
    alipayUrl: a.alipayUrl || a.paymentLink || '',
    qrImage: qr,
    qrCodeUrl: qr,
    wechatQrImage: a.wechatQrImage || (pt === 'wechat' ? qr : ''),
    alipayQrImage: a.alipayQrImage || (pt === 'alipay' ? qr : ''),
    customerServiceWechat: a.customerServiceWechat || '',
    customerServiceWhatsapp: a.customerServiceWhatsapp || '',
    note: a.note || a.instructions || '',
    instructions: a.note || a.instructions || ''
  }
}

exports.listPaymentAccounts = async (req, res) => {
  const items = await PaymentAccount.find().sort({ sortOrder: 1, createdAt: -1 }).lean()
  res.json({
    code: 0,
    message: 'success',
    data: { accounts: items.map(normalizeLegacyAccount) }
  })
}

exports.createPaymentAccount = async (req, res) => {
  const fields = pickBody(req.body)
  if (!fields.displayName) {
    const e = new Error('展示名称必填')
    e.code = 400
    throw e
  }
  const doc = await PaymentAccount.create(fields)
  res.json({
    code: 0,
    message: 'success',
    data: { account: normalizeLegacyAccount(doc.toObject()) }
  })
}

async function updateById(id, body) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const fields = pickBody(body)
  const patch = {}
  const keys = [
    'method',
    'paymentType',
    'displayName',
    'accountName',
    'bankName',
    'accountNo',
    'accountNumber',
    'sortCode',
    'iban',
    'wiseLink',
    'revolutLink',
    'paymentLink',
    'qrCodeUrl',
    'qrImage',
    'wechatQrImage',
    'alipayQrImage',
    'customerServiceWechat',
    'customerServiceWhatsapp',
    'instructions',
    'note',
    'enabled',
    'isActive',
    'sortOrder'
  ]
  for (const k of keys) {
    if (body[k] !== undefined || body.alipayUrl !== undefined || (k === 'displayName' && body.name != null)) {
      if (k === 'displayName') patch.displayName = fields.displayName
      else if (k === 'method') {
        patch.method = fields.method
        patch.paymentType = fields.paymentType
      } else if (k === 'paymentType') {
        patch.method = fields.method
        patch.paymentType = fields.paymentType
      } else if (k === 'accountNo' || k === 'accountNumber') {
        patch.accountNo = fields.accountNo
        patch.accountNumber = fields.accountNumber
      } else if (k === 'qrCodeUrl' || k === 'qrImage') {
        patch.qrCodeUrl = fields.qrCodeUrl
        patch.qrImage = fields.qrImage
      } else if (k === 'instructions' || k === 'note') {
        patch.instructions = fields.note
        patch.note = fields.note
      } else if (k === 'paymentLink') {
        patch.paymentLink = fields.paymentLink
      } else if (k === 'enabled' || k === 'isActive') {
        patch.enabled = fields.enabled
        patch.isActive = fields.isActive
      } else if (fields[k] !== undefined) {
        patch[k] = fields[k]
      }
    }
  }
  if (body.alipayUrl !== undefined) {
    patch.paymentLink = fields.paymentLink
  }
  const doc = await PaymentAccount.findByIdAndUpdate(id, { $set: patch }, { new: true })
  if (!doc) {
    const e = new Error('账户不存在')
    e.code = 404
    throw e
  }
  return normalizeLegacyAccount(doc.toObject())
}

exports.updatePaymentAccount = async (req, res) => {
  const account = await updateById(req.params.id, req.body || {})
  res.json({ code: 0, message: 'success', data: { account } })
}

exports.patchPaymentAccount = exports.updatePaymentAccount

exports.deletePaymentAccount = async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const r = await PaymentAccount.deleteOne({ _id: id })
  if (!r.deletedCount) {
    const e = new Error('账户不存在')
    e.code = 404
    throw e
  }
  res.json({ code: 0, message: 'success', data: {} })
}

exports.toPublicAccount = toPublicAccount
exports.pickBody = pickBody
