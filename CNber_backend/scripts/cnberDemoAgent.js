#!/usr/bin/env node
/**
 * CNber QA Demo Agent — 一条命令跑通预约用车 HTTP 闭环验收
 *
 * 由仓库根目录 scripts/cnber_demo_agent.sh 调用。
 * 测试数据均带 cnber_demo_agent 标记，不影响生产账号与真实订单。
 */
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const User = require('../models/User')
const Driver = require('../models/Driver')
const PaymentAccount = require('../models/PaymentAccount')
const Order = require('../models/Order')
const ORDER_STATUS = Order.ORDER_STATUS
const { orderStatusLabel } = require('../utils/orderStatus')
const { paymentSummary } = require('../utils/pricing')

const DEMO_TAG = 'cnber_demo_agent'
const HOST = process.env.DEMO_AGENT_HOST || process.env.SMOKE_HOST || '127.0.0.1'
const PORT = Number(process.env.DEMO_AGENT_PORT || process.env.SMOKE_PORT || 3100)
const REPORT_JSON = process.env.DEMO_AGENT_REPORT || process.argv[2] || '/tmp/cnber_demo_report.json'
const REPORT_MD = REPORT_JSON.replace(/\.json$/i, '') + '.md'
const PROOF_URL =
  process.env.SMOKE_PROOF_IMAGE_URL ||
  'https://placehold.co/600x400/png?text=cnber_demo_agent+proof'

const DEMO_PASSWORD = process.env.DEMO_AGENT_PASSWORD || `CnberDemo_${DEMO_TAG}_dev`

const ACCOUNTS = {
  customer: {
    phone: 'cnber_demo_agent_customer@cnber.local',
    role: 'user',
    label: '测试客户'
  },
  driver: {
    phone: 'cnber_demo_agent_driver@cnber.local',
    role: 'driver',
    label: '测试司机'
  },
  admin: {
    phone: 'cnber_demo_agent_admin@cnber.local',
    role: 'admin',
    label: '测试管理员'
  }
}

const PAYMENT_SEED = {
  paymentType: 'wise',
  displayName: `cnber_demo_agent Wise 收款`,
  accountName: 'CNber Demo Agent Ltd',
  wiseLink: 'https://wise.com/pay/me/cnber-demo-agent',
  note: `转账备注请填 CNBER-订单号 [${DEMO_TAG}]`,
  sortOrder: 99
}

const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnber'

const report = {
  tag: DEMO_TAG,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  result: 'PENDING',
  host: HOST,
  port: PORT,
  accounts: {},
  order: null,
  statusFlow: [],
  steps: [],
  failure: null
}

let tokens = { customer: null, driver: null, admin: null }
let userIds = { customer: null, driver: null, admin: null }
let paymentAccountId = null
let orderId = null
let orderNo = null

function httpReq(method, apiPath, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : ''
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload)

    const req = http.request(
      { hostname: HOST, port: PORT, path: apiPath, method, headers },
      (res) => {
        let raw = ''
        res.on('data', (c) => {
          raw += c
        })
        res.on('end', () => {
          let json = null
          try {
            json = raw ? JSON.parse(raw) : null
          } catch {
            /* plain text */
          }
          resolve({ status: res.statusCode, json, raw, api: apiPath, method })
        })
      }
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

function failStep(step, api, method, status, reason) {
  report.result = 'FAIL'
  report.failure = { step, api, method: method || 'GET', statusCode: status, reason }
  const line = `✗ ${step} — ${method || 'GET'} ${api} → ${status}: ${reason}`
  console.error(line)
  throw new Error(line)
}

async function runStep(name, api, method, fn) {
  const entry = { name, api, method, ok: false, statusCode: null, detail: '' }
  report.steps.push(entry)
  try {
    const result = await fn()
    entry.ok = true
    entry.statusCode = result?.status ?? 200
    entry.detail = result?.detail || ''
    console.log(`  ✓ ${name}${entry.detail ? ` — ${entry.detail}` : ''}`)
    return result
  } catch (err) {
    entry.ok = false
    entry.statusCode = err.statusCode || err.status || null
    entry.detail = err.message || String(err)
    failStep(name, api, method, entry.statusCode || '—', entry.detail)
  }
}

function recordStatus(status, note = '') {
  const last = report.statusFlow[report.statusFlow.length - 1]
  if (last && last.status === status) {
    if (note) last.note = last.note ? `${last.note}; ${note}` : note
    return
  }
  const item = { status, label: orderStatusLabel(status), at: new Date().toISOString(), note }
  report.statusFlow.push(item)
}

async function upsertDemoAccounts() {
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10)
  const customer = await User.findOneAndUpdate(
    { phone: ACCOUNTS.customer.phone },
    {
      $set: {
        phone: ACCOUNTS.customer.phone,
        password: hashed,
        role: 'user',
        status: 'active',
        passengerProfile: { realName: 'Demo Agent Customer', note: DEMO_TAG }
      }
    },
    { upsert: true, new: true }
  )
  const driverUser = await User.findOneAndUpdate(
    { phone: ACCOUNTS.driver.phone },
    {
      $set: {
        phone: ACCOUNTS.driver.phone,
        password: hashed,
        role: 'driver',
        status: 'active',
        driverProfile: {
          approvalStatus: 'approved',
          status: 'online',
          realName: 'Demo Agent Driver',
          vehiclePlate: 'DEMO-AGENT',
          vehicleModel: 'Demo Agent Car',
          documents: { reviewStatus: 'approved' },
          note: DEMO_TAG
        }
      }
    },
    { upsert: true, new: true }
  )
  const admin = await User.findOneAndUpdate(
    { phone: ACCOUNTS.admin.phone },
    {
      $set: {
        phone: ACCOUNTS.admin.phone,
        password: hashed,
        role: 'admin',
        status: 'active',
        adminProfile: { displayName: 'Demo Agent Admin', note: DEMO_TAG }
      }
    },
    { upsert: true, new: true }
  )

  await Driver.findOneAndUpdate(
    { userId: driverUser._id },
    {
      $set: {
        userId: driverUser._id,
        verificationStatus: 'approved',
        isActive: true,
        vehiclePlate: 'DEMO-AGENT',
        vehicleModel: 'Demo Agent Car',
        status: 'approved',
        adminNotes: DEMO_TAG
      }
    },
    { upsert: true, new: true }
  )

  const wiseAccount = await PaymentAccount.findOneAndUpdate(
    { displayName: PAYMENT_SEED.displayName },
    {
      $set: {
        ...PAYMENT_SEED,
        method: PAYMENT_SEED.paymentType,
        enabled: true,
        isActive: true
      }
    },
    { upsert: true, new: true }
  )

  userIds.customer = customer._id.toString()
  userIds.driver = driverUser._id.toString()
  userIds.admin = admin._id.toString()
  paymentAccountId = wiseAccount._id.toString()

  report.accounts = {
    customer: { phone: ACCOUNTS.customer.phone, userId: userIds.customer, password: DEMO_PASSWORD },
    driver: { phone: ACCOUNTS.driver.phone, userId: userIds.driver, password: DEMO_PASSWORD },
    admin: { phone: ACCOUNTS.admin.phone, userId: userIds.admin, password: DEMO_PASSWORD }
  }
}

async function login(role, phone) {
  const r = await httpReq('POST', '/api/auth/login', { phone, password: DEMO_PASSWORD })
  if (r.json?.code !== 0 || !r.json?.data?.token) {
    const err = new Error(r.json?.message || r.raw || 'login failed')
    err.statusCode = r.status
    throw err
  }
  tokens[role] = r.json.data.token
  return { status: r.status, detail: phone }
}

function scheduledAtIso() {
  return new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
}

function assertApiOk(r, stepName) {
  if (r.json?.code !== 0) {
    const err = new Error(r.json?.message || r.raw || 'API error')
    err.statusCode = r.status
    throw err
  }
  return r.json.data
}

function writeReports() {
  report.finishedAt = new Date().toISOString()
  const jsonDir = path.dirname(REPORT_JSON)
  if (jsonDir && jsonDir !== '.') {
    fs.mkdirSync(jsonDir, { recursive: true })
  }
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2), 'utf8')

  const lines = [
    '# CNber QA Demo Agent 报告',
    '',
    `**结果**: ${report.result}`,
    `**标记**: \`${DEMO_TAG}\``,
    `**开始**: ${report.startedAt}`,
    `**结束**: ${report.finishedAt}`,
    '',
    '## 测试账号',
    '',
    `| 角色 | 手机号 | User ID |`,
    `|------|--------|---------|`,
    `| 客户 | ${report.accounts.customer?.phone || '—'} | ${report.accounts.customer?.userId || '—'} |`,
    `| 司机 | ${report.accounts.driver?.phone || '—'} | ${report.accounts.driver?.userId || '—'} |`,
    `| 管理员 | ${report.accounts.admin?.phone || '—'} | ${report.accounts.admin?.userId || '—'} |`,
    '',
    '## 订单',
    '',
    report.order
      ? `- 订单号: **${report.order.orderNo}**`
      : '- 订单: 未创建',
    report.order ? `- 订单 ID: \`${report.order.orderId}\`` : '',
    report.order ? `- 最终状态: **${report.order.finalStatusLabel}** (\`${report.order.finalStatus}\`)` : '',
    '',
    '## 状态流',
    '',
    ...(report.statusFlow.length
      ? report.statusFlow.map(
          (s, i) =>
            `${i + 1}. \`${s.status}\` (${s.label})${s.note ? ` — ${s.note}` : ''}`
        )
      : ['（无）']),
    '',
    '## 步骤',
    '',
    ...report.steps.map((s) => {
      const mark = s.ok ? '✓' : '✗'
      return `- ${mark} **${s.name}** — ${s.method} ${s.api}${s.detail ? `: ${s.detail}` : ''}`
    }),
    ''
  ]

  if (report.failure) {
    lines.push(
      '## 失败详情',
      '',
      `- 步骤: ${report.failure.step}`,
      `- API: \`${report.failure.method} ${report.failure.api}\``,
      `- 状态码: ${report.failure.statusCode}`,
      `- 原因: ${report.failure.reason}`,
      ''
    )
  }

  fs.writeFileSync(REPORT_MD, lines.filter((l) => l !== undefined).join('\n'), 'utf8')
}

async function main() {
  console.log('\n=== CNber QA Demo Agent ===\n')
  console.log(`标记: ${DEMO_TAG}`)
  console.log(`报告: ${REPORT_JSON}\n`)

  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET 未设置，请在 CNber_backend/.env 中配置')
    process.exit(1)
  }

  await mongoose.connect(mongoUrl)
  await runStep('创建/更新 Demo 测试账号', 'mongodb://users', 'UPSERT', async () => {
    await upsertDemoAccounts()
    return { status: 200, detail: 'customer / driver / admin + 收款账户' }
  })

  await runStep('检查后端健康', '/api/status', 'GET', async () => {
    const r = await httpReq('GET', '/api/status')
    if (r.json?.code !== 0 || !r.json?.data?.ok) {
      const err = new Error('后端未就绪，请先启动 CNber_backend (npm start)')
      err.statusCode = r.status
      throw err
    }
    return { status: r.status, detail: `${HOST}:${PORT}` }
  })

  await runStep('客户登录', '/api/auth/login', 'POST', () => login('customer', ACCOUNTS.customer.phone))
  await runStep('司机登录', '/api/auth/login', 'POST', () => login('driver', ACCOUNTS.driver.phone))
  await runStep('管理员登录', '/api/auth/login', 'POST', () => login('admin', ACCOUNTS.admin.phone))

  const runId = Date.now().toString(36)
  const scheduledAt = scheduledAtIso()

  let order = null
  await runStep('创建预约订单', '/api/order/create', 'POST', async () => {
    const body = {
      pickup: `Heathrow T3 [${DEMO_TAG} ${runId}]`,
      destination: `London SW1A [${DEMO_TAG}]`,
      serviceType: 'pickup',
      scheduledAt,
      pickupDetail: `Demo Agent 预约 ${scheduledAt}`,
      vehicleClass: 'standard_5',
      vehicleLabel: '5座普通'
    }
    const r = await httpReq('POST', '/api/order/create', body, tokens.customer)
    const data = assertApiOk(r, 'create')
    order = data.order
    orderId = String(order._id)
    orderNo = order.orderNo
    recordStatus(order.status, '创建订单')
    return {
      status: r.status,
      detail: `${orderNo || orderId} scheduledAt=${scheduledAt}`
    }
  })

  if (order.priceStatus === 'quoted' || order.status === ORDER_STATUS.QUOTED) {
    await runStep('客户确认报价', '/api/order/confirm-price', 'POST', async () => {
      const r = await httpReq(
        'POST',
        '/api/order/confirm-price',
        { orderId },
        tokens.customer
      )
      const data = assertApiOk(r, 'confirm-price')
      order = data.order
      recordStatus(order.status, '确认报价')
      return { status: r.status, detail: order.status }
    })
  }

  const depositAmt = paymentSummary(order).depositAmount

  await runStep('客户提交定金', `/api/order/${orderId}/deposit/submit`, 'POST', async () => {
    const r = await httpReq(
      'POST',
      `/api/order/${orderId}/deposit/submit`,
      {
        payerName: 'Demo Agent Customer',
        paidAmount: depositAmt,
        proofImage: PROOF_URL,
        note: `cnber_demo_agent deposit ${orderNo}`,
        paymentAccountId,
        paymentMethod: 'wise'
      },
      tokens.customer
    )
    const data = assertApiOk(r, 'deposit')
    order = data.order
    recordStatus(order.status, `定金已提交 depositStatus=${order.depositStatus}`)
    return { status: r.status, detail: `£${depositAmt}` }
  })

  await runStep('后台确认定金', `/api/admin/orders/${orderId}/payment/deposit/confirm`, 'PATCH', async () => {
    const r = await httpReq(
      'PATCH',
      `/api/admin/orders/${orderId}/payment/deposit/confirm`,
      { paymentNote: `${DEMO_TAG} confirm deposit` },
      tokens.admin
    )
    const data = assertApiOk(r, 'confirm-deposit')
    order = data.order
    recordStatus(order.status, '定金已确认')
    return { status: r.status, detail: order.depositStatus }
  })

  await runStep('后台派单', `/api/admin/orders/${orderId}/assign-driver`, 'POST', async () => {
    const r = await httpReq(
      'POST',
      `/api/admin/orders/${orderId}/assign-driver`,
      { driverId: userIds.driver },
      tokens.admin
    )
    const data = assertApiOk(r, 'assign')
    order = data.order
    recordStatus(order.status, '已派单')
    return { status: r.status, detail: `driver=${userIds.driver}` }
  })

  await runStep('司机确认接单', '/api/order/accept', 'POST', async () => {
    const r = await httpReq('POST', '/api/order/accept', { orderId }, tokens.driver)
    const data = assertApiOk(r, 'accept')
    order = data.order
    recordStatus(order.status, '司机已接单')
    return { status: r.status, detail: order.status }
  })

  await runStep('后台发起尾款', `/api/admin/orders/${orderId}/balance/request`, 'POST', async () => {
    const r = await httpReq(
      'POST',
      `/api/admin/orders/${orderId}/balance/request`,
      {},
      tokens.admin
    )
    const data = assertApiOk(r, 'balance-request')
    order = data.order
    return { status: r.status, detail: order.paymentStage }
  })

  const balanceAmt = paymentSummary(order).balanceAmount
  await runStep('客户提交尾款', `/api/order/${orderId}/balance/submit`, 'POST', async () => {
    const r = await httpReq(
      'POST',
      `/api/order/${orderId}/balance/submit`,
      {
        payerName: 'Demo Agent Customer',
        paidAmount: balanceAmt,
        proofImage: PROOF_URL,
        note: `cnber_demo_agent balance ${orderNo}`,
        paymentAccountId,
        paymentMethod: 'wise'
      },
      tokens.customer
    )
    const data = assertApiOk(r, 'balance-submit')
    order = data.order
    return { status: r.status, detail: `£${balanceAmt}` }
  })

  await runStep('后台确认尾款', `/api/admin/orders/${orderId}/payment/balance/confirm`, 'PATCH', async () => {
    const r = await httpReq(
      'PATCH',
      `/api/admin/orders/${orderId}/payment/balance/confirm`,
      { paymentNote: `${DEMO_TAG} confirm balance` },
      tokens.admin
    )
    const data = assertApiOk(r, 'confirm-balance')
    order = data.order
    recordStatus(order.status, '尾款已确认')
    return { status: r.status, detail: order.balanceStatus }
  })

  await runStep('推进至待出发', `/api/admin/orders/${orderId}/pay-remaining`, 'POST', async () => {
    const r = await httpReq(
      'POST',
      `/api/admin/orders/${orderId}/pay-remaining`,
      {},
      tokens.admin
    )
    const data = assertApiOk(r, 'pay-remaining')
    order = data.order
    recordStatus(ORDER_STATUS.READY_TO_START, '待出发')
    return { status: r.status, detail: order.status }
  })

  await runStep('司机开始行程', '/api/order/start', 'POST', async () => {
    const r = await httpReq('POST', '/api/order/start', { orderId }, tokens.driver)
    const data = assertApiOk(r, 'start')
    order = data.order
    recordStatus(ORDER_STATUS.IN_PROGRESS, '行程中')
    return { status: r.status, detail: order.status }
  })

  await runStep('司机完成订单', '/api/order/complete', 'POST', async () => {
    const r = await httpReq('POST', '/api/order/complete', { orderId }, tokens.driver)
    const data = assertApiOk(r, 'complete')
    order = data.order
    recordStatus(ORDER_STATUS.COMPLETED, '已完成')
    return { status: r.status, detail: order.status }
  })

  await runStep('读取并验证订单详情', `/api/order/detail/${orderId}`, 'GET', async () => {
    const r = await httpReq('GET', `/api/order/detail/${orderId}`, null, tokens.customer)
    const data = assertApiOk(r, 'detail')
    const final = data.order
    if (final.status !== ORDER_STATUS.COMPLETED) {
      const err = new Error(`期望 completed，实际 ${final.status}`)
      err.statusCode = r.status
      throw err
    }
    if (!String(final.pickup || '').includes(DEMO_TAG)) {
      const err = new Error('订单 pickup 缺少 cnber_demo_agent 标记')
      err.statusCode = r.status
      throw err
    }
    report.order = {
      orderId,
      orderNo: final.orderNo || orderNo,
      finalStatus: final.status,
      finalStatusLabel: orderStatusLabel(final.status),
      customerPhone: ACCOUNTS.customer.phone,
      driverUserId: userIds.driver,
      scheduledAt,
      depositStatus: final.depositStatus,
      balanceStatus: final.balanceStatus
    }
    return { status: r.status, detail: `${final.orderNo} → ${final.status}` }
  })

  report.result = 'PASS'
  writeReports()

  console.log('\n--- 报告 ---')
  console.log(`订单号: ${report.order.orderNo}`)
  console.log(`客户: ${ACCOUNTS.customer.phone}`)
  console.log(`司机: ${ACCOUNTS.driver.phone} (${userIds.driver})`)
  console.log(`状态流: ${report.statusFlow.map((s) => s.label).join(' → ')}`)
  console.log(`JSON: ${REPORT_JSON}`)
  console.log(`Markdown: ${REPORT_MD}`)
  console.log(`\n>>> PASS\n`)
}

main()
  .catch((err) => {
    if (report.result !== 'FAIL') {
      report.result = 'FAIL'
      if (!report.failure) {
        report.failure = {
          step: 'unexpected',
          api: '—',
          method: '—',
          statusCode: null,
          reason: err.message || String(err)
        }
      }
    }
    try {
      writeReports()
    } catch (writeErr) {
      console.error('写入报告失败:', writeErr.message)
    }
    console.error(`\n❌ Demo Agent 失败: ${err.message}\n`)
    process.exit(1)
  })
  .finally(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  })
