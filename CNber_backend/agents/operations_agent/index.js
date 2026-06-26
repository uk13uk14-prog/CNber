#!/usr/bin/env node
/**
 * CNber Operations Agent — 后台只读巡检
 */
require('dotenv').config()

const mongoose = require('mongoose')
const Order = require('../../models/Order')
const User = require('../../models/User')
const { getQueueStats } = require('../../services/jobQueueService')
const { httpGet } = require('../_shared/httpClient')
const { writeAgentReports } = require('../_shared/reportWriter')

const ORDER_STATUS = Order.ORDER_STATUS
const DISPATCH_STATUS = Order.DISPATCH_STATUS

const UNDISPATCH_MS = Number(process.env.OPS_UNDISPATCH_MS || 2 * 60 * 60 * 1000)
const UNPAID_MS = Number(process.env.OPS_UNPAID_MS || 24 * 60 * 60 * 1000)
const INCOMPLETE_MS = Number(process.env.OPS_INCOMPLETE_MS || 48 * 60 * 60 * 1000)
const DRIVER_IDLE_MS = Number(process.env.OPS_DRIVER_IDLE_MS || 60 * 60 * 1000)

const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnber'

const report = {
  agent: 'operations_agent',
  startedAt: new Date().toISOString(),
  finishedAt: null,
  result: 'PENDING',
  thresholds: {
    undispatchMs: UNDISPATCH_MS,
    unpaidMs: UNPAID_MS,
    incompleteMs: INCOMPLETE_MS,
    driverIdleMs: DRIVER_IDLE_MS
  },
  orders: {},
  drivers: {},
  jobQueue: {},
  database: {},
  api: {},
  alerts: []
}

function ago(ms) {
  return new Date(Date.now() - ms)
}

function pushAlert(level, message, detail = {}) {
  report.alerts.push({ level, message, ...detail, at: new Date().toISOString() })
}

async function inspectOrders() {
  const undispatchBefore = ago(UNDISPATCH_MS)
  const unpaidBefore = ago(UNPAID_MS)
  const incompleteBefore = ago(INCOMPLETE_MS)

  const [longUndispatched, longUnpaid, longIncomplete] = await Promise.all([
    Order.find({
      status: { $in: [ORDER_STATUS.DEPOSIT_PAID, ORDER_STATUS.PENDING] },
      dispatchStatus: { $in: [DISPATCH_STATUS.PENDING, DISPATCH_STATUS.UNASSIGNED] },
      updatedAt: { $lt: undispatchBefore }
    })
      .select('orderNo status dispatchStatus updatedAt createdAt')
      .sort({ updatedAt: 1 })
      .limit(50)
      .lean(),
    Order.find({
      $or: [
        { depositStatus: 'submitted', updatedAt: { $lt: unpaidBefore } },
        { balanceStatus: 'submitted', updatedAt: { $lt: unpaidBefore } },
        {
          status: { $in: [ORDER_STATUS.QUOTED, ORDER_STATUS.CONFIRMED] },
          depositStatus: { $in: [null, '', 'pending', 'unpaid'] },
          updatedAt: { $lt: unpaidBefore }
        }
      ],
      status: { $ne: ORDER_STATUS.CANCELLED }
    })
      .select('orderNo status depositStatus balanceStatus updatedAt')
      .sort({ updatedAt: 1 })
      .limit(50)
      .lean(),
    Order.find({
      status: {
        $in: [
          ORDER_STATUS.ASSIGNED,
          ORDER_STATUS.DRIVER_ACCEPTED,
          ORDER_STATUS.ACCEPTED,
          ORDER_STATUS.READY_TO_START,
          ORDER_STATUS.IN_PROGRESS,
          ORDER_STATUS.STARTED,
          ORDER_STATUS.ARRIVED
        ]
      },
      updatedAt: { $lt: incompleteBefore }
    })
      .select('orderNo status updatedAt')
      .sort({ updatedAt: 1 })
      .limit(50)
      .lean()
  ])

  report.orders = {
    longUndispatched: {
      count: longUndispatched.length,
      thresholdHours: UNDISPATCH_MS / 3600000,
      samples: longUndispatched.map((o) => ({
        orderNo: o.orderNo,
        status: o.status,
        dispatchStatus: o.dispatchStatus,
        updatedAt: o.updatedAt
      }))
    },
    longUnpaid: {
      count: longUnpaid.length,
      thresholdHours: UNPAID_MS / 3600000,
      samples: longUnpaid.map((o) => ({
        orderNo: o.orderNo,
        status: o.status,
        depositStatus: o.depositStatus,
        balanceStatus: o.balanceStatus,
        updatedAt: o.updatedAt
      }))
    },
    longIncomplete: {
      count: longIncomplete.length,
      thresholdHours: INCOMPLETE_MS / 3600000,
      samples: longIncomplete.map((o) => ({
        orderNo: o.orderNo,
        status: o.status,
        updatedAt: o.updatedAt
      }))
    }
  }

  if (longUndispatched.length) {
    pushAlert('warn', `${longUndispatched.length} 笔订单长时间未派单`, {
      category: 'orders.undispatched'
    })
  }
  if (longUnpaid.length) {
    pushAlert('warn', `${longUnpaid.length} 笔订单长时间未支付/待审`, {
      category: 'orders.unpaid'
    })
  }
  if (longIncomplete.length) {
    pushAlert('warn', `${longIncomplete.length} 笔订单长时间未完成`, {
      category: 'orders.incomplete'
    })
  }
}

async function inspectDrivers() {
  const idleBefore = ago(DRIVER_IDLE_MS)

  const [online, offline, idleOnline] = await Promise.all([
    User.countDocuments({ role: 'driver', 'driverProfile.status': 'online' }),
    User.countDocuments({ role: 'driver', 'driverProfile.status': 'offline' }),
    User.find({
      role: 'driver',
      'driverProfile.status': 'online',
      lastSeen: { $lt: idleBefore }
    })
      .select('phone driverProfile.status lastSeen')
      .sort({ lastSeen: 1 })
      .limit(30)
      .lean()
  ])

  report.drivers = {
    online,
    offline,
    longIdleOnline: {
      count: idleOnline.length,
      thresholdMinutes: DRIVER_IDLE_MS / 60000,
      samples: idleOnline.map((d) => ({
        phone: d.phone,
        status: d.driverProfile?.status,
        lastSeen: d.lastSeen
      }))
    }
  }

  if (idleOnline.length) {
    pushAlert('info', `${idleOnline.length} 名司机在线但长时间未活跃`, {
      category: 'drivers.idle'
    })
  }
}

async function inspectJobQueue() {
  const stats = await getQueueStats()
  report.jobQueue = {
    pending: stats.pending,
    running: stats.running,
    failed: stats.failed,
    success: stats.success,
    total: stats.total
  }
  if (stats.failed > 0) {
    pushAlert('warn', `Job Queue 有 ${stats.failed} 个失败任务`, { category: 'jobQueue.failed' })
  }
  if (stats.pending > 100) {
    pushAlert('warn', `Job Queue 积压 ${stats.pending} 个待处理任务`, {
      category: 'jobQueue.pending'
    })
  }
}

async function inspectDatabase() {
  const state = mongoose.connection.readyState
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  const ok = state === 1
  let pingMs = null
  if (ok) {
    const t0 = Date.now()
    await mongoose.connection.db.admin().ping()
    pingMs = Date.now() - t0
  }
  report.database = {
    ok,
    state: states[state] || String(state),
    pingMs
  }
  if (!ok) {
    pushAlert('error', 'MongoDB 连接异常', { category: 'database' })
  }
}

async function inspectApi() {
  const status = await httpGet('/api/status')
  const statusOk = status.status === 200 && status.json?.code === 0 && status.json?.data?.ok

  let healthOk = false
  let healthDetail = null
  try {
    const health = await httpGet('/api/admin/system-health')
    healthOk = health.status === 200
    healthDetail = {
      httpStatus: health.status,
      note: health.status === 401 ? '需要管理员 Token（仅检查 HTTP 可达）' : health.json?.message
    }
  } catch (err) {
    healthDetail = { error: err.message }
  }

  report.api = {
    status: {
      ok: statusOk,
      httpStatus: status.status,
      message: status.json?.data?.message || status.raw?.slice(0, 200)
    },
    health: {
      ok: healthOk,
      endpoint: '/api/admin/system-health',
      ...healthDetail
    }
  }

  if (!statusOk) {
    pushAlert('error', '后端 /api/status 不可用', { category: 'api.status' })
  }
}

function buildMarkdown() {
  const lines = [
    '# CNber Operations Agent 报告',
    '',
    `**结果**: ${report.result}`,
    `**开始**: ${report.startedAt}`,
    `**结束**: ${report.finishedAt}`,
    '',
    '## 订单巡检',
    '',
    `- 长时间未派单: **${report.orders.longUndispatched?.count ?? 0}** (>${report.thresholds.undispatchMs / 3600000}h)`,
    `- 长时间未支付: **${report.orders.longUnpaid?.count ?? 0}** (>${report.thresholds.unpaidMs / 3600000}h)`,
    `- 长时间未完成: **${report.orders.longIncomplete?.count ?? 0}** (>${report.thresholds.incompleteMs / 3600000}h)`,
    '',
    '## 司机',
    '',
    `- 在线: **${report.drivers.online ?? 0}**`,
    `- 离线: **${report.drivers.offline ?? 0}**`,
    `- 在线但长时间未活跃: **${report.drivers.longIdleOnline?.count ?? 0}**`,
    '',
    '## Job Queue',
    '',
    `| Pending | Running | Failed | Success |`,
    `|---------|---------|--------|---------|`,
    `| ${report.jobQueue.pending ?? 0} | ${report.jobQueue.running ?? 0} | ${report.jobQueue.failed ?? 0} | ${report.jobQueue.success ?? 0} |`,
    '',
    '## 数据库',
    '',
    `- MongoDB: **${report.database.ok ? '正常' : '异常'}** (${report.database.state}, ping ${report.database.pingMs ?? '—'}ms)`,
    '',
    '## API',
    '',
    `- /api/status: **${report.api.status?.ok ? 'OK' : 'FAIL'}** (HTTP ${report.api.status?.httpStatus})`,
    `- /api/admin/system-health: HTTP ${report.api.health?.httpStatus ?? '—'}`,
    ''
  ]

  if (report.alerts.length) {
    lines.push('## 告警', '')
    for (const a of report.alerts) {
      lines.push(`- [${a.level}] ${a.message}`)
    }
    lines.push('')
  }

  return lines
}

async function main() {
  console.log('\n=== CNber Operations Agent ===\n')

  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET 未设置')
    process.exit(1)
  }

  await mongoose.connect(mongoUrl)

  await inspectDatabase()
  await inspectOrders()
  await inspectDrivers()
  await inspectJobQueue()
  await inspectApi()

  const hasError = report.alerts.some((a) => a.level === 'error')
  const hasWarn = report.alerts.some((a) => a.level === 'warn')
  report.result = hasError ? 'FAIL' : hasWarn ? 'WARN' : 'PASS'
  report.finishedAt = new Date().toISOString()

  const { jsonPath, mdPath } = writeAgentReports('operations_report', report, buildMarkdown())

  console.log(`订单未派单: ${report.orders.longUndispatched.count}`)
  console.log(`订单未支付: ${report.orders.longUnpaid.count}`)
  console.log(`订单未完成: ${report.orders.longIncomplete.count}`)
  console.log(`司机在线/离线: ${report.drivers.online}/${report.drivers.offline}`)
  console.log(`Job Queue: P${report.jobQueue.pending} R${report.jobQueue.running} F${report.jobQueue.failed}`)
  console.log(`MongoDB: ${report.database.ok ? 'ok' : 'error'}`)
  console.log(`\nJSON: ${jsonPath}`)
  console.log(`Markdown: ${mdPath}`)
  console.log(`\n>>> ${report.result}\n`)

  await mongoose.disconnect()
  if (hasError) process.exit(1)
}

main().catch(async (err) => {
  report.result = 'FAIL'
  report.finishedAt = new Date().toISOString()
  report.failure = err.message
  try {
    writeAgentReports('operations_report', report, [
      '# CNber Operations Agent 报告',
      '',
      `**结果**: FAIL`,
      `**错误**: ${err.message}`
    ])
  } catch {
    /* ignore */
  }
  console.error(`\n❌ Operations Agent 失败: ${err.message}\n`)
  if (mongoose.connection.readyState === 1) await mongoose.disconnect()
  process.exit(1)
})
