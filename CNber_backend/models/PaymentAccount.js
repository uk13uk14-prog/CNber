const mongoose = require('mongoose')

const METHODS = ['bank', 'wise', 'revolut', 'wechat', 'alipay', 'other']

const PaymentAccountSchema = new mongoose.Schema(
  {
    /** 与 paymentType 同义，保留 method 兼容旧数据 */
    method: { type: String, enum: METHODS, default: 'other' },
    paymentType: { type: String, enum: METHODS, default: 'other' },
    displayName: { type: String, required: true, trim: true },
    accountName: { type: String, default: '', trim: true },
    bankName: { type: String, default: '', trim: true },
    accountNo: { type: String, default: '', trim: true },
    accountNumber: { type: String, default: '', trim: true },
    sortCode: { type: String, default: '', trim: true },
    iban: { type: String, default: '', trim: true },
    wiseLink: { type: String, default: '', trim: true },
    revolutLink: { type: String, default: '', trim: true },
    paymentLink: { type: String, default: '', trim: true },
    qrCodeUrl: { type: String, default: '', trim: true },
    qrImage: { type: String, default: '', trim: true },
    wechatQrImage: { type: String, default: '', trim: true },
    alipayQrImage: { type: String, default: '', trim: true },
    customerServiceWechat: { type: String, default: '', trim: true },
    customerServiceWhatsapp: { type: String, default: '', trim: true },
    instructions: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true },
    enabled: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
)

PaymentAccountSchema.index({ enabled: 1, sortOrder: 1 })

function normalizeLegacyAccount(doc) {
  if (!doc) return doc
  const row = { ...doc }
  const pt = row.paymentType || row.method || row.type || 'other'
  row.paymentType = pt
  row.method = pt
  if (!row.displayName && row.name) row.displayName = row.name
  if (!row.accountName && row.receiverName) row.accountName = row.receiverName
  if (!row.accountNumber && row.accountNo) row.accountNumber = row.accountNo
  if (!row.accountNo && row.accountNumber) row.accountNo = row.accountNumber
  if (!row.qrImage && row.qrCodeUrl) row.qrImage = row.qrCodeUrl
  if (!row.note && row.instructions) row.note = row.instructions
  if (row.isActive === undefined) row.isActive = row.enabled !== false
  if (row.enabled === undefined) row.enabled = row.isActive !== false
  if (pt === 'wechat' && !row.wechatQrImage && row.qrImage) row.wechatQrImage = row.qrImage
  if (pt === 'alipay' && !row.alipayQrImage && row.qrImage) row.alipayQrImage = row.qrImage
  return row
}

PaymentAccountSchema.set('toJSON', {
  transform(_doc, ret) {
    return normalizeLegacyAccount(ret)
  }
})

const PaymentAccount = mongoose.model('PaymentAccount', PaymentAccountSchema)

module.exports = PaymentAccount
module.exports.PAYMENT_METHODS = METHODS
module.exports.normalizeLegacyAccount = normalizeLegacyAccount
