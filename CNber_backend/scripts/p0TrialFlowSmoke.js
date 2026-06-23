/**
 * P0 预约制试运营闭环 — 本地模拟 smoke（直连 MongoDB + 控制器，无需启动 HTTP）
 *
 * 用法：npm run smoke:p0
 */
require('dotenv').config()

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET 未设置，请在 CNber_backend/.env 中配置')
  process.exit(1)
}

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Driver = require('../models/Driver')
const PaymentAccount = require('../models/PaymentAccount')
const Order = require('../models/Order')
const ORDER_STATUS = Order.ORDER_STATUS

const orderController = require('../controllers/orderController')
const orderPaymentController = require('../controllers/orderPaymentController')
const adminController = require('../controllers/adminController')
const p0OperationsController = require('../controllers/p0OperationsController')
const { enrichOrderPaymentFields } = require('../utils/enrichOrderPayments')
const { buildOrderFinanceSnapshot } = require('../utils/orderFinanceSnapshot')
const { paymentSummary } = require('../utils/pricing')

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'
const SMOKE_TAG = 'SMOKE_P0_TRIAL_FLOW'
const PROOF_URL =
  process.env.SMOKE_PROOF_IMAGE_URL ||
  'https://placehold.co/600x400/png?text=CNber+Payment+Proof'

const ACCOUNTS = {
  customer: { phone: 'test_customer@cnber.local', password: '123456', role: 'user' },
  driver: { phone: 'test_driver@cnber.local', password: '123456', role: 'driver' },
  admin: { phone: 'admin@cnber.local', password: '123456', role: 'admin' }
}

const PAYMENT_SEEDS = [
  {
    key: 'wise',
    paymentType: 'wise',
    displayName: 'P0测试 Wise 收款',
    accountName: 'CNber Test Ltd',
    wiseLink: 'https://wise.com/pay/me/smoke-test',
    note: '转账备注请填 CNBER-订单号',
    sortOrder: 1
  },
  {
    key: 'bank',
    paymentType: 'bank',
    displayName: 'P0测试 银行转账',
    accountName: 'CNber Test Ltd',
    bankName: 'Test Bank UK',
    sortCode: '12-34-56',
    accountNumber: '12345678',
    iban: 'GB00TEST00000012345678',
    note: '银行转账备注 CNBER-订单号',
    sortOrder: 2
  },
  {
    key: 'wechat',
    paymentType: 'wechat',
    displayName: 'P0测试 微信收款',
    accountName: 'CNber客服',
    wechatQrImage: 'https://placehold.co/300x300/png?text=WeChat+QR',
    customerServiceWechat: 'cnber_test_wechat',
    sortOrder: 3
  }
]

const steps = []
let failed = false

function logStep(name, ok, detail = '') {
  const mark = ok ? '✓' : '✗'
  console.log(`  ${mark} ${name}${detail ? ` — ${detail}` : ''}`)
  steps.push({ name, ok, detail })
  if (!ok) failed = true
}

function assert(cond, name, detail) {
  logStep(name, Boolean(cond), detail)
  if (!cond) {
    const e = new Error(detail || name)
    e.step = name
    throw e
  }
}

function mockReq(user, body = {}, params = {}) {
  return {
    user: {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role
    },
    body,
    params,
    ip: '127.0.0.1',
    protocol: 'http',
    get: () => 'localhost:3100'
  }
}

async function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload })
      },
      send() {
        resolve({ status: this.statusCode, body: null })
      }
    }
    const next = (err) => {
      if (err && typeof err === 'object' && !(err instanceof Error)) {
        reject(Object.assign(new Error(err.message || 'error'), err))
        return
      }
      reject(err)
    }
    Promise.resolve(handler(req, res, next)).catch(reject)
  })
}

async function upsertUser({ phone, password, role, extra = {} }) {
  const hashed = await bcrypt.hash(password, 10)
  return User.findOneAndUpdate(
    { phone },
    {
      $set: {
        phone,
        password: hashed,
        role,
        status: 'active',
        ...extra
      }
    },
    { upsert: true, new: true }
  )
}

async function upsertPaymentAccounts() {
  const map = {}
  for (const seed of PAYMENT_SEEDS) {
    const doc = await PaymentAccount.findOneAndUpdate(
      { displayName: seed.displayName },
      {
        $set: {
          ...seed,
          method: seed.paymentType,
          enabled: true,
          isActive: true
        }
      },
      { upsert: true, new: true }
    )
    map[seed.key] = doc
  }
  return map
}

async function setupDriverUser(driverUser) {
  await Driver.findOneAndUpdate(
    { userId: driverUser._id },
    {
      $set: {
        userId: driverUser._id,
        verificationStatus: 'approved',
        isActive: true,
        vehiclePlate: 'TEST-001',
        vehicleModel: 'Smoke Test Car',
        status: 'approved',
        adminNotes: SMOKE_TAG
      }
    },
    { upsert: true, new: true }
  )
  await User.findByIdAndUpdate(driverUser._id, {
    $set: {
      driverProfile: {
        approvalStatus: 'approved',
        status: 'online',
        vehiclePlate: 'TEST-001',
        vehicleModel: 'Smoke Test Car',
        documents: { reviewStatus: 'approved' }
      }
    }
  })
}

function scheduleNote() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

async function reloadOrder(orderId) {
  return Order.findById(orderId).lean()
}

async function main() {
  console.log('\n=== CNber P0 预约制闭环 Smoke ===\n')

  await mongoose.connect(mongoUrl)
  logStep('连接 MongoDB', true, mongoUrl)

  const customer = await upsertUser({
    ...ACCOUNTS.customer,
    extra: { passengerProfile: { realName: 'Test Customer' } }
  })
  const driver = await upsertUser({
    ...ACCOUNTS.driver,
    extra: {
      driverProfile: {
        approvalStatus: 'approved',
        status: 'online',
        vehiclePlate: 'TEST-001'
      }
    }
  })
  const admin = await upsertUser(ACCOUNTS.admin)
  logStep('测试账号就绪', true, 'customer / driver / admin')

  const paymentMap = await upsertPaymentAccounts()
  const wiseAccount = paymentMap.wise
  const enabledCount = await PaymentAccount.countDocuments({
    enabled: { $ne: false },
    isActive: { $ne: false }
  })
  assert(enabledCount >= 3, '收款账户已启用', `count=${enabledCount}`)
  assert(wiseAccount && wiseAccount._id, 'Wise 测试账户存在', wiseAccount?.displayName)

  await setupDriverUser(driver)
  const driverDoc = await Driver.findOne({ userId: driver._id }).lean()
  assert(driverDoc?.verificationStatus === 'approved', '司机 verificationStatus=approved')
  assert(driverDoc?.isActive === true, '司机 isActive=true')

  let order = await Order.findOne({
    userId: customer._id,
    pickup: new RegExp(SMOKE_TAG)
  })
    .sort({ createdAt: -1 })
    .lean()

  const terminal = [ORDER_STATUS.CANCELLED, ORDER_STATUS.COMPLETED]
  if (!order || terminal.includes(order.status)) {
    const createReq = mockReq(customer, {
      userId: customer._id.toString(),
      pickup: `Heathrow Terminal 3 [${SMOKE_TAG}]`,
      destination: `London SW1A 1AA [${SMOKE_TAG}]`,
      serviceType: 'pickup',
      pickupDetail: `预约时间 ${scheduleNote()}`,
      status: ORDER_STATUS.CREATED
    })
    await invoke(orderController.createOrder, createReq)
    order = await Order.findOne({
      userId: customer._id,
      pickup: new RegExp(SMOKE_TAG)
    })
      .sort({ createdAt: -1 })
      .lean()
  }
  assert(order && order._id, '测试订单已创建', order?._id?.toString())

  if (order.status === ORDER_STATUS.CREATED || order.priceStatus === 'pending') {
    await invoke(adminController.quoteOrder, mockReq(admin, { orderId: order._id.toString(), amount: 120 }))
    order = await reloadOrder(order._id)
  }
  assert(
    [ORDER_STATUS.QUOTED, ORDER_STATUS.CONFIRMED].includes(order.status) || order.priceStatus === 'quoted',
    '订单已报价',
    `status=${order.status} priceStatus=${order.priceStatus}`
  )

  if (order.priceStatus === 'quoted') {
    await invoke(orderController.confirmPrice, mockReq(customer, { orderId: order._id.toString() }))
    order = await reloadOrder(order._id)
  }
  assert(order.priceStatus === 'confirmed', '客户已确认价格', order.priceStatus)

  const summary = paymentSummary(order)
  const depositAmt = summary.depositAmount

  if (!['submitted', 'confirmed'].includes(order.depositStatus)) {
    const depositReq = mockReq(
      customer,
      {
        payerName: 'Test Customer',
        paidAmount: depositAmt,
        proofImage: PROOF_URL,
        note: `已通过 Wise 转账，备注 CNBER-${order.orderNo || order._id}`,
        paymentAccountId: wiseAccount._id.toString(),
        paymentMethod: 'wise'
      },
      { id: order._id.toString() }
    )
    await invoke(orderPaymentController.submitDeposit, depositReq)
    order = await reloadOrder(order._id)
  }
  assert(
    ['submitted', 'confirmed'].includes(order.depositStatus),
    '定金提交后 depositStatus=submitted 或已确认',
    order.depositStatus
  )
  assert(Boolean(order.depositProofImage || order.depositPaymentInfo?.proofImage), '定金 proofImage 存在')
  assert(
    String(order.depositPaymentInfo?.paymentMethod || '') === 'wise' ||
      String(order.depositPaymentInfo?.method || '') === 'wise',
    '定金 paymentMethod=wise'
  )

  if (order.depositStatus !== 'confirmed' && !order.depositPaid) {
    await invoke(
      orderPaymentController.adminConfirmDeposit,
      mockReq(admin, { paymentNote: 'smoke confirm deposit' }, { id: order._id.toString() })
    )
    order = await reloadOrder(order._id)
  }
  assert(order.depositStatus === 'confirmed' || order.depositPaid, '确认定金后 deposit 已确认')

  if (order.status !== ORDER_STATUS.ASSIGNED || !order.driverId) {
    await invoke(
      adminController.assignDriver,
      mockReq(admin, { driverId: driver._id.toString() }, { id: order._id.toString() })
    )
    order = await reloadOrder(order._id)
  }
  assert(order.driverId && String(order.driverId) === String(driver._id), '派单后存在 driverId')
  assert(
    [ORDER_STATUS.ASSIGNED, ORDER_STATUS.DRIVER_ACCEPTED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.COMPLETED].includes(
      order.status
    ),
    '派单后状态有效',
    order.status
  )

  if (order.status === ORDER_STATUS.ASSIGNED) {
  await invoke(
    async (req, res) => {
      const { orderId } = req.body
      const updated = await Order.findOneAndUpdate(
        { _id: orderId, status: ORDER_STATUS.ASSIGNED, driverId: req.user.userId },
        {
          $set: {
            status: ORDER_STATUS.DRIVER_ACCEPTED,
            dispatchStatus: Order.DISPATCH_STATUS.ACCEPTED,
            updatedAt: new Date()
          }
        },
        { new: true }
      )
      if (!updated) {
        const e = new Error('接单失败')
        e.code = 400
        throw e
      }
      res.json({ code: 0, message: 'success', data: { order: updated } })
    },
    mockReq(driver, { orderId: order._id.toString() })
  )
  order = await reloadOrder(order._id)
  }
  assert(
    [ORDER_STATUS.DRIVER_ACCEPTED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.COMPLETED].includes(
      order.status
    ),
    '司机接单后状态正确',
    order.status
  )

  if (order.paymentStage !== 'balance_pending' && order.balanceStatus !== 'confirmed') {
  await invoke(
    orderPaymentController.adminRequestBalance,
    mockReq(admin, {}, { id: order._id.toString() })
  )
  }
  const balanceAmt = paymentSummary(order).balanceAmount
  if (!['submitted', 'confirmed'].includes(order.balanceStatus)) {
  await invoke(
    orderPaymentController.submitBalance,
    mockReq(
      customer,
      {
        payerName: 'Test Customer',
        paidAmount: balanceAmt,
        proofImage: PROOF_URL,
        note: `尾款 Wise CNBER-${order.orderNo || order._id}`,
        paymentAccountId: wiseAccount._id.toString(),
        paymentMethod: 'wise'
      },
      { id: order._id.toString() }
    )
  )
  order = await reloadOrder(order._id)
  }
  assert(
    ['submitted', 'confirmed'].includes(order.balanceStatus) || order.remainingPaid,
    '尾款提交后 balanceStatus 有效',
    order.balanceStatus
  )

  if (order.balanceStatus !== 'confirmed' && !order.remainingPaid) {
    await invoke(
      orderPaymentController.adminConfirmBalance,
      mockReq(admin, {}, { id: order._id.toString() })
    )
    order = await reloadOrder(order._id)
  }
  assert(order.balanceStatus === 'confirmed' || order.remainingPaid, '尾款确认后 balance 已确认')

  if (![ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.STARTED, ORDER_STATUS.COMPLETED].includes(order.status)) {
  await invoke(orderController.startOrder, mockReq(driver, { orderId: order._id.toString() }))
  order = await reloadOrder(order._id)
  }
  assert(
    [ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.STARTED, ORDER_STATUS.COMPLETED].includes(order.status),
    '开始后行程状态正确',
    order.status
  )

  if (order.status !== ORDER_STATUS.COMPLETED) {
  await invoke(orderController.completeOrder, mockReq(driver, { orderId: order._id.toString() }))
  order = await reloadOrder(order._id)
  }
  assert(order.status === ORDER_STATUS.COMPLETED, '完成后 status=completed', order.status)

  if (order.driverSettlementStatus !== 'paid') {
  await invoke(
    orderPaymentController.adminConfirmDriverSettlement,
    mockReq(admin, { amount: order.priceBreakdown?.driverPayout || 90 }, { id: order._id.toString() })
  )
  order = await reloadOrder(order._id)
  }
  assert(order.driverSettlementStatus === 'paid', '司机结算已确认', order.driverSettlementStatus)

  if (order.serviceStatus !== 'closed') {
    await invoke(p0OperationsController.closeOrder, mockReq(admin, { note: 'smoke close' }, { id: order._id.toString() }))
  }
  order = await enrichOrderPaymentFields(await reloadOrder(order._id))
  const finance = buildOrderFinanceSnapshot(order)
  const enriched = await enrichOrderPaymentFields(order)

  assert(enriched.depositPaymentInfo?.paymentAccount?.displayName, 'paymentAccount 可解析', enriched.depositPaymentInfo?.paymentAccount?.displayName)
  assert(finance.platformProfit != null && finance.platformProfit >= 0, '平台毛利可计算', `£${finance.platformProfit}`)

  const report = {
    orderNo: order.orderNo,
    orderId: String(order._id),
    status: order.status,
    depositStatus: order.depositStatus,
    balanceStatus: order.balanceStatus,
    assignedDriver: order.driverId ? String(order.driverId) : null,
    settlementStatus: order.settlementStatus,
    driverSettlementStatus: order.driverSettlementStatus,
    platformProfit: finance.platformProfit,
    depositProof: Boolean(order.depositProofImage || order.depositPaymentInfo?.proofImage),
    paymentMethod: order.depositPaymentInfo?.paymentMethod || order.depositPaymentInfo?.method,
    paymentAccountDisplay: enriched.depositPaymentInfo?.paymentAccount?.displayName,
    result: failed ? 'FAIL' : 'PASS'
  }

  console.log('\n--- 报告 ---')
  console.log(JSON.stringify(report, null, 2))
  console.log(`\n>>> ${report.result}\n`)

  if (failed) process.exit(1)
}

main()
  .catch((err) => {
    console.error('\n❌ Smoke 失败:', err.message || err)
    if (err.stack) console.error(err.stack)
    process.exit(1)
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
