const PaymentAccount = require('../models/PaymentAccount')
const { normalizeLegacyAccount } = require('../models/PaymentAccount')
const { toPublicAccount } = require('./paymentAccountController')

/**
 * GET /api/payment/accounts
 * 公开：仅返回 enabled=true 的收款方式
 */
exports.listPublicAccounts = async (req, res) => {
  const items = await PaymentAccount.find({
    enabled: { $ne: false },
    isActive: { $ne: false }
  })
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean()
  const accounts = items.map((row) => toPublicAccount(normalizeLegacyAccount(row)))
  res.json({ code: 0, message: 'success', data: { accounts } })
}

/** @deprecated 兼容 scene 查询参数，忽略 scene 过滤 */
exports.listAccountsByScene = exports.listPublicAccounts
