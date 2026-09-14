const mongoose = require('mongoose')
const os = require('os')
const Order = require('../models/Order')
const User = require('../models/User')
const SupportTicket = require('../models/SupportTicket')
const DriverSettlement = require('../models/DriverSettlement')
const SystemSetting = require('../models/SystemSetting')
const SystemAuditLog = require('../models/SystemAuditLog')
const ORDER_STATUS = Order.ORDER_STATUS
const DISPATCH_STATUS = Order.DISPATCH_STATUS
const { roundMoney } = require('../utils/pricing')

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function parseDateRange(query = {}) {
  const startRaw = String(query.startDate || '').trim()
  const endRaw = String(query.endDate || '').trim()
  let start = startOfToday()
  let end = new Date()
  if (startRaw) {
    const d = new Date(`${startRaw}T00:00:00`)
    if (!Number.isNaN(d.getTime())) start = d
  }
  if (endRaw) {
    const d = new Date(`${endRaw}T23:59:59.999`)
    if (!Number.isNaN(d.getTime())) end = d
  }
  return { start, end }
}

function estimateDiskUsagePercent() {
  try {
    if (process.platform === 'win32') {
      const { execSync } = require('child_process')
      const out = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace,Size /value', {
        encoding: 'utf8',
        timeout: 5000
      })
      const free = Number((out.match(/FreeSpace=(\d+)/) || [])[1] || 0)
      const size = Number((out.match(/Size=(\d+)/) || [])[1] || 0)
      if (size > 0) return Math.round(((size - free) / size) * 100)
    } else {
      const { execSync } = require('child_process')
      const line = execSync("df -k / | tail -1", { encoding: 'utf8', timeout: 5000 }).trim()
      const parts = line.split(/\s+/)
      const used = parts[4]
      if (used && used.endsWith('%')) return parseInt(used, 10)
    }
  } catch {
    /* fallback */
  }
  const total = os.totalmem()
  const free = os.freemem()
  if (total > 0) return Math.round(((total - free) / total) * 100)
  return 0
}

/** GET /api/admin/trial-dashboard */
exports.getTrialDashboard = async (req, res) => {
  const t0 = startOfToday()
  const now = new Date()

  const [
    pendingPayment,
    paymentReview,
    readyDispatch,
    inTrip,
    completedToday,
    cancelledToday,
    revenueRows,
    newTickets,
    processingTickets,
    closedTicketsToday,
    activeDrivers,
    idleDrivers,
    pendingSettlements
  ] = await Promise.all([
    Order.countDocuments({
      createdAt: { $gte: t0 },
      $or: [
        { depositStatus: { $in: ['unpaid', 'pending'] } },
        { paymentStatus: 'unpaid' },
        { status: { $in: [ORDER_STATUS.QUOTED, ORDER_STATUS.CONFIRMED] } }
      ]
    }),
    Order.countDocuments({
      createdAt: { $gte: t0 },
      $or: [{ depositStatus: 'submitted' }, { balanceStatus: 'submitted' }]
    }),
    Order.countDocuments({
      createdAt: { $gte: t0 },
      status: { $in: [ORDER_STATUS.DEPOSIT_PAID, ORDER_STATUS.PENDING] },
      depositPaid: { $ne: false },
      dispatchStatus: { $in: [DISPATCH_STATUS.PENDING, DISPATCH_STATUS.UNASSIGNED] }
    }),
    Order.countDocuments({
      updatedAt: { $gte: t0 },
      status: {
        $in: [
          ORDER_STATUS.IN_PROGRESS,
          ORDER_STATUS.STARTED,
          ORDER_STATUS.ACCEPTED,
          ORDER_STATUS.ASSIGNED
        ]
      }
    }),
    Order.countDocuments({ status: ORDER_STATUS.COMPLETED, updatedAt: { $gte: t0 } }),
    Order.countDocuments({ status: ORDER_STATUS.CANCELLED, updatedAt: { $gte: t0 } }),
    Order.aggregate([
      {
        $match: {
          status: ORDER_STATUS.COMPLETED,
          updatedAt: { $gte: t0, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          customerRevenueCny: { $sum: { $ifNull: ['$customerPriceCny', 0] } },
          driverCostCny: { $sum: { $ifNull: ['$driverSettlementCny', 0] } },
          grossProfitCny: { $sum: { $ifNull: ['$platformProfitCny', 0] } }
        }
      }
    ]),
    SupportTicket.countDocuments({ createdAt: { $gte: t0 } }),
    SupportTicket.countDocuments({ status: 'in_progress' }),
    SupportTicket.countDocuments({
      status: { $in: ['resolved', 'closed'] },
      updatedAt: { $gte: t0 }
    }),
    User.countDocuments({
      role: 'driver',
      'driverProfile.status': 'online',
      status: { $ne: 'banned' }
    }),
    User.countDocuments({
      role: 'driver',
      $or: [{ 'driverProfile.status': { $ne: 'online' } }, { 'driverProfile.status': { $exists: false } }],
      status: { $ne: 'banned' }
    }),
    DriverSettlement.countDocuments({ status: 'pending' })
  ])

  const rev = revenueRows[0] || {}

  res.json({
    code: 0,
    message: 'success',
    data: {
      date: t0.toISOString().slice(0, 10),
      todayOrders: {
        pendingPayment,
        paymentReview,
        readyDispatch,
        inTrip,
        completed: completedToday,
        cancelled: cancelledToday
      },
      todayRevenue: {
        customerRevenueCny: roundMoney(rev.customerRevenueCny || 0),
        driverCostCny: roundMoney(rev.driverCostCny || 0),
        grossProfitCny: roundMoney(rev.grossProfitCny || 0)
      },
      todaySupport: {
        newTickets,
        processingTickets,
        closedTickets: closedTicketsToday
      },
      todayDrivers: {
        activeDrivers,
        idleDrivers,
        pendingSettlements
      }
    }
  })
}

/** GET /api/admin/backup/status */
exports.getBackupStatus = async (req, res) => {
  const conn = mongoose.connection
  const mongoConnected = conn.readyState === 1
  let dbSizeMb = 0
  if (mongoConnected && conn.db) {
    try {
      const stats = await conn.db.stats()
      dbSizeMb = Math.round(((stats.dataSize || 0) + (stats.indexSize || 0)) / (1024 * 1024))
    } catch {
      dbSizeMb = 0
    }
  }

  const [orderCount, customerCount, driverCount, backupSetting] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'driver' }),
    SystemSetting.findOne({ key: 'backup.lastRunAt' }).lean()
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      mongoConnected,
      dbSizeMb,
      orderCount,
      customerCount,
      driverCount,
      lastBackupAt: backupSetting?.value || null
    }
  })
}

/** POST /api/admin/backup/run — V1 预留 */
exports.runBackup = async (req, res) => {
  res.json({
    code: 0,
    message: '预留',
    data: { message: '预留' }
  })
}

/** GET /api/admin/system-health */
exports.getSystemHealth = async (req, res) => {
  const conn = mongoose.connection
  const mongoOk = conn.readyState === 1

  const [
    totalOrders,
    totalDrivers,
    totalCustomers,
    onlineDrivers,
    pendingPaymentReview,
    pendingDispatch
  ] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments({ role: 'driver' }),
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'driver', 'driverProfile.status': 'online' }),
    Order.countDocuments({
      $or: [{ depositStatus: 'submitted' }, { balanceStatus: 'submitted' }]
    }),
    Order.countDocuments({
      status: { $in: [ORDER_STATUS.DEPOSIT_PAID, ORDER_STATUS.PENDING] },
      depositPaid: { $ne: false },
      dispatchStatus: { $in: [DISPATCH_STATUS.PENDING, DISPATCH_STATUS.UNASSIGNED] }
    })
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      backend: 'ok',
      mongodb: mongoOk ? 'ok' : 'error',
      pm2: process.env.pm_id != null ? 'ok' : 'n/a',
      diskUsagePercent: estimateDiskUsagePercent(),
      totalOrders,
      totalDrivers,
      totalCustomers,
      onlineDrivers,
      pendingPaymentReview,
      pendingDispatch
    }
  })
}

/** GET /api/admin/audit-logs */
exports.listAuditLogs = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const { start, end } = parseDateRange(req.query)
  const query = { createdAt: { $gte: start, $lte: end } }

  const module = String(req.query.module || '').trim()
  if (module) query.module = module

  const [items, total] = await Promise.all([
    SystemAuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    SystemAuditLog.countDocuments(query)
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      logs: items,
      total,
      page,
      pageSize
    }
  })
}
