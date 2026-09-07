const mongoose = require('mongoose')
const Order = require('../models/Order')
const ORDER_STATUS = Order.ORDER_STATUS
const { paymentSummary, roundMoney } = require('../utils/pricing')
const {
  attachPaymentToOrder,
  buildDepositConfirmedSet,
  buildBalanceConfirmedSet,
  canConfirmDeposit,
  canConfirmBalance,
  legacyDepositStatus,
  mapToMvpStatus
} = require('../utils/orderPaymentSync')
const { logPushPayload } = require('../utils/operationLog')
const { auditLog } = require('../utils/auditLog')
const { presentOrderForApi } = require('../utils/orderPresentation')
const PaymentAccount = require('../models/PaymentAccount')
const { normalizeLegacyAccount } = require('../models/PaymentAccount')
const { savePaymentProofImage } = require('../utils/paymentProofUpload')
const { resolveCouponSnapshot } = require('../utils/couponOrder')

function publicBaseUrl(req) {
  const env = process.env.PUBLIC_BASE_URL || process.env.APP_PUBLIC_BASE_URL
  if (env) return String(env).replace(/\/$/, '')
  return `${req.protocol}://${req.get('host')}`
}

async function resolveSelectedAccount(body) {
  const paymentAccountId = body.paymentAccountId || body.selectedPaymentAccountId
  const paymentMethod = String(body.paymentMethod || body.method || '').trim()
  if (!paymentAccountId) {
    return { account: null, paymentMethod, paymentAccountId: null }
  }
  if (!mongoose.Types.ObjectId.isValid(String(paymentAccountId))) {
    const e = new Error('收款账户无效')
    e.code = 400
    throw e
  }
  const raw = await PaymentAccount.findById(paymentAccountId).lean()
  if (!raw || raw.enabled === false || raw.isActive === false) {
    const e = new Error('收款账户不可用')
    e.code = 400
    throw e
  }
  const account = normalizeLegacyAccount(raw)
  return {
    account,
    paymentMethod: paymentMethod || account.paymentType || account.method || 'other',
    paymentAccountId: account._id
  }
}

async function assertPaymentSubmit(body) {
  const proof = String(body.proofImage || body.depositProofImage || body.balanceProofImage || '').trim()
  const transactionRef = String(
    body.transactionRef || body.transactionId || body.reference || ''
  ).trim()
  const note = String(body.note || body.remark || '').trim()
  if (!transactionRef && !note) {
    const e = new Error('请填写付款流水号或付款备注')
    e.code = 400
    throw e
  }
  const enabledCount = await PaymentAccount.countDocuments({
    enabled: { $ne: false },
    isActive: { $ne: false }
  })
  const { account, paymentMethod, paymentAccountId } = await resolveSelectedAccount(body)
  if (enabledCount > 0 && !paymentAccountId) {
    const e = new Error('请选择付款方式')
    e.code = 400
    throw e
  }
  return { proof, note, transactionRef, account, paymentMethod, paymentAccountId }
}

function assertValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(String(id || ''))) {
    const e = new Error('订单 ID 无效')
    e.code = 400
    throw e
  }
}

function assertOrderOwner(order, userId) {
  const uid = order.userId && (order.userId._id || order.userId)
  if (!uid || String(uid) !== String(userId)) {
    const e = new Error('无权操作该订单')
    e.code = 403
    throw e
  }
}

exports.uploadPaymentProof = async (req, res) => {
  if (req.user.role !== 'user') {
    const e = new Error('仅客户可上传凭证')
    e.code = 403
    throw e
  }
  const { id } = req.params
  assertValidId(id)
  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  assertOrderOwner(current, req.user.userId)
  const imageData = req.body?.imageBase64 || req.body?.image || req.body?.proofImage
  const { relativeUrl } = savePaymentProofImage(imageData, id)
  const url = `${publicBaseUrl(req)}${relativeUrl}`
  res.json({
    code: 0,
    message: 'success',
    data: { url, path: relativeUrl }
  })
}

exports.submitDeposit = async (req, res) => {
  if (req.user.role !== 'user') {
    const e = new Error('仅客户可提交付款信息')
    e.code = 403
    throw e
  }
  const { id } = req.params
  assertValidId(id)
  const body = req.body || {}
  const { proof, note, transactionRef, paymentMethod, paymentAccountId } = await assertPaymentSubmit(body)
  const { payerName, paidAmount } = body
  const name = String(payerName || '').trim()
  const amt = Number(paidAmount)
  if (!name) {
    const e = new Error('付款人姓名必填')
    e.code = 400
    throw e
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    const e = new Error('付款金额须为正数')
    e.code = 400
    throw e
  }

  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  assertOrderOwner(current, req.user.userId)
  if (!['unpaid', 'rejected'].includes(current.depositStatus)) {
    const e = new Error('当前不可提交定金信息')
    e.code = 400
    throw e
  }

  const couponCodeInput = String(body.couponCode || body.coupon || '').trim()
  let couponSnapshot = {}
  if (couponCodeInput) {
    couponSnapshot = await resolveCouponSnapshot(current, couponCodeInput)
    const expectedPay = couponSnapshot.payableAmountCny
    if (Math.abs(roundMoney(amt) - expectedPay) > 0.02) {
      const e = new Error(`付款金额须为优惠后 ¥${expectedPay.toFixed(2)}`)
      e.code = 400
      throw e
    }
  } else if (
    current.couponCode &&
    current.payableAmountCny != null &&
    Math.abs(roundMoney(amt) - Number(current.payableAmountCny)) > 0.02
  ) {
    const e = new Error(`付款金额须为 ¥${Number(current.payableAmountCny).toFixed(2)}`)
    e.code = 400
    throw e
  }

  const submittedAt = new Date()
  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: {
        depositStatus: legacyDepositStatus('pending'),
        paymentStage: 'deposit_submitted',
        depositProofImage: proof,
        depositNote: note,
        depositPaymentInfo: {
          method: paymentMethod,
          paymentMethod,
          paymentAccountId: paymentAccountId || null,
          payerName: name,
          paidAmount: roundMoney(amt),
          transactionRef,
          remark: note,
          proofImage: proof,
          submittedAt,
          confirmedAt: null,
          confirmedBy: null,
          rejectedReason: ''
        },
        'payment.depositStatus': 'pending',
        'payment.depositAmount': roundMoney(amt),
        'payment.paymentNote': note,
        ...couponSnapshot,
        updatedAt: submittedAt
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({
    code: 0,
    message: 'success',
    data: { order: await presentOrderForApi(order.toObject ? order.toObject() : order) }
  })
}

exports.submitBalance = async (req, res) => {
  if (req.user.role !== 'user') {
    const e = new Error('仅客户可提交付款信息')
    e.code = 403
    throw e
  }
  const { id } = req.params
  assertValidId(id)
  const body = req.body || {}
  const { proof, note, transactionRef, paymentMethod, paymentAccountId } = await assertPaymentSubmit(body)
  const { payerName, paidAmount } = body
  const name = String(payerName || '').trim()
  const amt = Number(paidAmount)
  if (!name) {
    const e = new Error('付款人姓名必填')
    e.code = 400
    throw e
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    const e = new Error('付款金额须为正数')
    e.code = 400
    throw e
  }

  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  assertOrderOwner(current, req.user.userId)
  if (current.paymentStage !== 'balance_pending') {
    const e = new Error('当前未处于尾款待付阶段')
    e.code = 400
    throw e
  }
  if (!['unpaid', 'rejected'].includes(current.balanceStatus)) {
    const e = new Error('当前不可提交尾款信息')
    e.code = 400
    throw e
  }

  const submittedAt = new Date()
  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: {
        balanceStatus: legacyDepositStatus('pending'),
        paymentStage: 'balance_submitted',
        balanceProofImage: proof,
        balanceNote: note,
        balancePaymentInfo: {
          method: paymentMethod,
          paymentMethod,
          paymentAccountId: paymentAccountId || null,
          payerName: name,
          paidAmount: roundMoney(amt),
          transactionRef,
          remark: note,
          proofImage: proof,
          submittedAt,
          confirmedAt: null,
          confirmedBy: null,
          rejectedReason: ''
        },
        'payment.balanceStatus': 'pending',
        'payment.balanceAmount': roundMoney(amt),
        updatedAt: submittedAt
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({
    code: 0,
    message: 'success',
    data: { order: await presentOrderForApi(order.toObject ? order.toObject() : order) }
  })
}

exports.adminConfirmDeposit = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  if (!canConfirmDeposit(current)) {
    const alreadyConfirmed =
      current.depositStatus === 'confirmed' ||
      current.paymentStage === 'deposit_confirmed' ||
      mapToMvpStatus(current.payment?.depositStatus) === 'confirmed'
    const e = new Error(
      alreadyConfirmed ? '定金已确认，无需重复操作' : '当前定金状态不可确认'
    )
    e.code = 400
    throw e
  }
  const note = String((req.body && req.body.paymentNote) || '').trim()
  const set = buildDepositConfirmedSet(current, req.user.userId)
  if (note && set.payment) set.payment.paymentNote = note
  if (current.status === ORDER_STATUS.CONFIRMED) {
    set.status = ORDER_STATUS.DEPOSIT_PAID
  }
  const depAmt = roundMoney(
    set.payment?.depositAmount ?? set.depositAmount ?? paymentSummary(current).depositAmount
  )
  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: set,
      $push: logPushPayload(req, 'confirm_deposit', `确认已收定金 £${depAmt}`)
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')
    .populate('assignedDriver', 'phone role driverProfile')

  void auditLog(req, {
    action: '确认付款',
    module: 'payment_reviews',
    entityId: String(id),
    entityType: 'order',
    description: `确认已收定金 £${depAmt}`
  })

  res.json({
    code: 0,
    message: 'success',
    data: { order: await presentOrderForApi(order.toObject ? order.toObject() : order) }
  })
}

exports.adminRejectDeposit = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const reason = String((req.body && req.body.reason) || '').trim()
  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  if (current.depositStatus !== 'submitted') {
    const e = new Error('当前不可驳回定金')
    e.code = 400
    throw e
  }
  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: {
        depositStatus: 'rejected',
        paymentStage: 'deposit_pending',
        depositPaid: false,
        'depositPaymentInfo.rejectedReason': reason || '已驳回',
        updatedAt: new Date()
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({ code: 0, message: 'success', data: { order } })
}

exports.adminRequestBalance = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  const sum = paymentSummary(current)
  if (!canDepositConfirmed(current, sum)) {
    const e = new Error('定金未确认，无法发起尾款')
    e.code = 400
    throw e
  }
  if (['balance_pending', 'balance_submitted', 'balance_confirmed', 'completed'].includes(current.paymentStage)) {
    const e = new Error('尾款流程已发起或已完成')
    e.code = 400
    throw e
  }

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: {
        paymentStage: 'balance_pending',
        balanceStatus: 'unpaid',
        updatedAt: new Date()
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({ code: 0, message: 'success', data: { order } })
}

function canDepositConfirmed(order, sum) {
  if (order.depositStatus === 'confirmed') return true
  if (!order.paymentStage || order.paymentStage === 'none') return sum.depositPaid
  return false
}

exports.adminConfirmBalance = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  if (!canConfirmBalance(current)) {
    const e = new Error('尾款不可确认（请先确认定金或尾款已结清）')
    e.code = 400
    throw e
  }
  const note = String((req.body && req.body.paymentNote) || '').trim()
  const set = buildBalanceConfirmedSet(current, req.user.userId)
  if (note && set.payment) set.payment.paymentNote = note
  const balAmt = roundMoney(
    set.payment?.balanceAmount ?? set.balanceAmount ?? paymentSummary(current).balanceAmount
  )
  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: set,
      $push: logPushPayload(req, 'confirm_balance', `确认已收尾款 £${balAmt}`)
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  void auditLog(req, {
    action: '确认付款',
    module: 'payment_reviews',
    entityId: String(id),
    entityType: 'order',
    description: `确认已收尾款 £${balAmt}`
  })

  res.json({
    code: 0,
    message: 'success',
    data: { order: await presentOrderForApi(order.toObject ? order.toObject() : order) }
  })
}

exports.adminRejectBalance = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const reason = String((req.body && req.body.reason) || '').trim()
  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  if (current.balanceStatus !== 'submitted') {
    const e = new Error('当前不可驳回尾款')
    e.code = 400
    throw e
  }
  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: {
        balanceStatus: 'rejected',
        paymentStage: 'balance_pending',
        remainingPaid: false,
        'balancePaymentInfo.rejectedReason': reason || '已驳回',
        updatedAt: new Date()
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({ code: 0, message: 'success', data: { order } })
}

exports.adminConfirmDriverSettlement = async (req, res) => {
  const { id } = req.params
  assertValidId(id)
  const current = await Order.findById(id)
  if (!current) {
    const e = new Error('订单不存在')
    e.code = 404
    throw e
  }
  if (current.status !== ORDER_STATUS.COMPLETED) {
    const e = new Error('仅已完成订单可确认司机结算')
    e.code = 400
    throw e
  }
  const body = req.body || {}
  const amt =
    body.amount != null && Number.isFinite(Number(body.amount))
      ? roundMoney(Number(body.amount))
      : roundMoney(
          current.driverSettlementAmount ??
            current.priceBreakdown?.driverPayout ??
            paymentSummary(current).totalPrice * 0.75
        )

  const order = await Order.findByIdAndUpdate(
    id,
    {
      $set: {
        driverSettlementStatus: 'paid',
        driverSettlementAmount: amt,
        driverSettlementConfirmedAt: new Date(),
        driverSettlementConfirmedBy: req.user.userId,
        updatedAt: new Date()
      }
    },
    { new: true }
  )
    .populate('userId', 'phone role')
    .populate('driverId', 'phone role')

  res.json({ code: 0, message: 'success', data: { order } })
}
