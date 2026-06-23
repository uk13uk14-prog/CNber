const mongoose = require('mongoose')
const PaymentAccount = require('../models/PaymentAccount')
const { normalizeLegacyAccount } = require('../models/PaymentAccount')

const METHOD_LABELS = {
  bank: '银行转账',
  wise: 'Wise',
  revolut: 'Revolut',
  wechat: '微信',
  alipay: '支付宝',
  other: '其他'
}

function paymentMethodLabel(method) {
  const m = String(method || '').trim()
  return METHOD_LABELS[m] || m || '—'
}

function accountSnapshot(doc) {
  if (!doc) return null
  const a = normalizeLegacyAccount(typeof doc.toObject === 'function' ? doc.toObject() : doc)
  const pt = a.paymentType || a.method || ''
  return {
    _id: a._id,
    displayName: a.displayName || '',
    paymentType: pt,
    method: pt,
    accountName: a.accountName || ''
  }
}

async function loadAccountsMap(ids) {
  const valid = [
    ...new Set(
      (ids || [])
        .map((id) => String(id || ''))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    )
  ]
  if (!valid.length) return new Map()
  const rows = await PaymentAccount.find({ _id: { $in: valid } }).lean()
  const map = new Map()
  for (const r of rows) {
    map.set(String(r._id), r)
  }
  return map
}

function collectAccountIdsFromOrders(orders) {
  const ids = []
  for (const o of orders) {
    const depId = o.depositPaymentInfo && o.depositPaymentInfo.paymentAccountId
    const balId = o.balancePaymentInfo && o.balancePaymentInfo.paymentAccountId
    if (depId) ids.push(depId)
    if (balId) ids.push(balId)
  }
  return ids
}

function enrichPaymentInfo(info, accountMap, { note, proofImage } = {}) {
  const base = info && typeof info === 'object' ? { ...info } : {}
  const paymentMethod = String(base.paymentMethod || base.method || '').trim()
  base.paymentMethod = paymentMethod
  base.method = paymentMethod
  base.remark = String(base.remark || note || '').trim()
  base.transactionRef = String(base.transactionRef || '').trim()
  base.proofImage = String(base.proofImage || proofImage || '').trim()
  const aid = base.paymentAccountId ? String(base.paymentAccountId) : ''
  base.paymentAccount = aid ? accountSnapshot(accountMap.get(aid)) : null
  base.paymentMethodLabel = paymentMethodLabel(paymentMethod)
  return base
}

/**
 * 为订单详情补充 depositPaymentInfo / balancePaymentInfo 完整展示字段
 */
async function enrichOrderPaymentFields(order) {
  if (!order) return order
  const o = { ...(order.toObject ? order.toObject() : order) }
  const accountMap = await loadAccountsMap(collectAccountIdsFromOrders([o]))
  o.depositPaymentInfo = enrichPaymentInfo(o.depositPaymentInfo, accountMap, {
    note: o.depositNote,
    proofImage: o.depositProofImage
  })
  o.balancePaymentInfo = enrichPaymentInfo(o.balancePaymentInfo, accountMap, {
    note: o.balanceNote,
    proofImage: o.balanceProofImage
  })
  return o
}

function buildReviewItem(order, type, accountMap) {
  const isDeposit = type === 'deposit'
  const info = isDeposit ? order.depositPaymentInfo || {} : order.balancePaymentInfo || {}
  const paymentAccountId = info.paymentAccountId ? String(info.paymentAccountId) : ''
  const paymentMethod = String(info.paymentMethod || info.method || '').trim()
  const account = paymentAccountId ? accountMap.get(paymentAccountId) : null
  const proofImage = isDeposit
    ? order.depositProofImage || info.proofImage || ''
    : order.balanceProofImage || info.proofImage || ''
  const note = isDeposit
    ? order.depositNote || info.remark || ''
    : order.balanceNote || info.remark || ''
  const transactionRef = String(info.transactionRef || '').trim()

  return {
    _id: `${order._id}-${type}`,
    orderId: order._id,
    orderNo: order.orderNo || '',
    customerPhone: (order.userId && order.userId.phone) || '',
    type,
    typeLabel: isDeposit ? '定金' : '尾款',
    amount: info.paidAmount != null ? info.paidAmount : isDeposit ? order.depositAmount : order.balanceAmount,
    payerName: info.payerName || '',
    paymentMethod,
    paymentMethodLabel: paymentMethodLabel(paymentMethod),
    paymentAccountId: paymentAccountId || null,
    paymentAccount: accountSnapshot(account),
    transactionRef,
    note,
    proofImage,
    reviewStatus: '待人工核对',
    submittedAt: info.submittedAt || order.updatedAt,
    status: isDeposit ? order.depositStatus : order.balanceStatus
  }
}

/**
 * 将订单列表展开为待审核行（每笔提交一行）
 */
async function buildPaymentReviewItems(orders, stage = 'pending') {
  const accountMap = await loadAccountsMap(collectAccountIdsFromOrders(orders))
  const items = []

  for (const o of orders) {
    if (stage === 'deposit') {
      if (o.depositStatus === 'submitted') items.push(buildReviewItem(o, 'deposit', accountMap))
      continue
    }
    if (stage === 'balance') {
      if (o.balanceStatus === 'submitted') items.push(buildReviewItem(o, 'balance', accountMap))
      continue
    }
    if (stage === 'refund') {
      items.push({
        _id: String(o._id),
        orderId: o._id,
        orderNo: o.orderNo || '',
        customerPhone: (o.userId && o.userId.phone) || '',
        type: 'refund',
        typeLabel: '退款',
        amount: o.refundAmount,
        payerName: '',
        paymentMethod: '',
        paymentMethodLabel: '—',
        paymentAccountId: null,
        paymentAccount: null,
        note: o.exceptionReason || o.exceptionNotes || '',
        proofImage: '',
        submittedAt: o.handledAt || o.updatedAt,
        status: o.exceptionType || ''
      })
      continue
    }
    if (o.depositStatus === 'submitted') items.push(buildReviewItem(o, 'deposit', accountMap))
    if (o.balanceStatus === 'submitted') items.push(buildReviewItem(o, 'balance', accountMap))
  }

  items.sort((a, b) => {
    const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
    const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
    return tb - ta
  })
  return items
}

module.exports = {
  paymentMethodLabel,
  accountSnapshot,
  enrichOrderPaymentFields,
  buildPaymentReviewItems,
  loadAccountsMap
}
