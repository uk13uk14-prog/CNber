const Order = require('../models/Order')
const User = require('../models/User')
const Driver = require('../models/Driver')
const ORDER_STATUS = Order.ORDER_STATUS
const { startOfToday, collectSystemHealth } = require('../utils/systemMetrics')
const { getQueueStats } = require('../services/jobQueueService')
const ONLINE_WINDOW_MS = 5 * 60 * 1000
const STAFF_SUPPORT_ROLE = 'support'
const STAFF_ADMIN_ROLE = 'admin'

function onlineSince() {
  return new Date(Date.now() - ONLINE_WINDOW_MS)
}

async function countOnlineByRole(role) {
  return User.countDocuments({
    role,
    status: { $ne: 'banned' },
    lastSeen: { $gte: onlineSince() }
  })
}

async function countDailyActiveByRole(role) {
  return User.countDocuments({
    role,
    status: { $ne: 'banned' },
    lastSeen: { $gte: startOfToday() }
  })
}

async function buildOnlineUsers() {
  const [customers, drivers, support, admins, travelAgency] = await Promise.all([
    countOnlineByRole('user'),
    countOnlineByRole('driver'),
    countOnlineByRole(STAFF_SUPPORT_ROLE),
    countOnlineByRole(STAFF_ADMIN_ROLE),
    countOnlineByRole('travel_agency')
  ])
  const total = customers + drivers + support + admins + travelAgency
  return {
    total,
    customers,
    drivers,
    support,
    admins,
    travelAgency
  }
}

async function buildDailyActiveUsers() {
  const [customers, drivers, travelAgency, support, admins] = await Promise.all([
    countDailyActiveByRole('user'),
    countDailyActiveByRole('driver'),
    countDailyActiveByRole('travel_agency'),
    countDailyActiveByRole(STAFF_SUPPORT_ROLE),
    countDailyActiveByRole(STAFF_ADMIN_ROLE)
  ])
  return {
    customers,
    drivers,
    travelAgency,
    support,
    admins
  }
}

async function buildOrderStats() {
  const t0 = startOfToday()
  const [
    todayCreated,
    todayQuoted,
    todayDepositPaid,
    todayAssigned,
    todayCompleted,
    totalOrders,
    totalCompleted
  ] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: t0 } }),
    Order.countDocuments({ status: ORDER_STATUS.QUOTED, updatedAt: { $gte: t0 } }),
    Order.countDocuments({ status: ORDER_STATUS.DEPOSIT_PAID, updatedAt: { $gte: t0 } }),
    Order.countDocuments({ status: ORDER_STATUS.ASSIGNED, updatedAt: { $gte: t0 } }),
    Order.countDocuments({ status: ORDER_STATUS.COMPLETED, updatedAt: { $gte: t0 } }),
    Order.countDocuments(),
    Order.countDocuments({ status: ORDER_STATUS.COMPLETED })
  ])

  return {
    today: {
      created: todayCreated,
      quoted: todayQuoted,
      depositPaid: todayDepositPaid,
      assigned: todayAssigned,
      completed: todayCompleted
    },
    total: {
      orders: totalOrders,
      completed: totalCompleted
    }
  }
}

async function buildDriverStats() {
  const [online, offline, approved, pending, dispatchable] = await Promise.all([
    User.countDocuments({ role: 'driver', 'driverProfile.status': 'online' }),
    User.countDocuments({ role: 'driver', 'driverProfile.status': 'offline' }),
    User.countDocuments({
      role: 'driver',
      $or: [
        { 'driverProfile.approvalStatus': 'approved' },
        { 'driverProfile.documents.reviewStatus': 'approved' }
      ]
    }),
    User.countDocuments({
      role: 'driver',
      'driverProfile.approvalStatus': 'pending',
      'driverProfile.documents.reviewStatus': { $ne: 'approved' }
    }),
    User.countDocuments({
      role: 'driver',
      status: { $ne: 'banned' },
      'driverProfile.status': 'online',
      $or: [
        { 'driverProfile.approvalStatus': 'approved' },
        { 'driverProfile.documents.reviewStatus': 'approved' }
      ]
    })
  ])

  // 兼容 Driver 集合中 status=approved 但 User 嵌套字段未同步的情况
  const driverApprovedCount = await Driver.countDocuments({ status: 'approved' })

  return {
    online,
    offline,
    approved: Math.max(approved, driverApprovedCount),
    pending,
    dispatchable
  }
}

async function buildJobQueueStats() {
  const stats = await getQueueStats()
  return {
    pending: stats.pending,
    running: stats.running,
    failed: stats.failed,
    success: stats.success
  }
}

/** GET /api/admin/dashboard/overview */exports.getDashboardOverview = async (req, res) => {
  const [onlineUsers, dailyActiveUsers, orders, drivers, system, jobQueue] = await Promise.all([
    buildOnlineUsers(),
    buildDailyActiveUsers(),
    buildOrderStats(),
    buildDriverStats(),
    collectSystemHealth(),
    buildJobQueueStats()
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      onlineUsers,
      dailyActiveUsers,
      orders,
      drivers,
      system,
      jobQueue
    }
  })
}

/** GET /api/admin/system/health */
exports.getSystemHealth = async (req, res) => {
  const data = await collectSystemHealth()
  res.json({
    code: 0,
    message: 'success',
    data
  })
}
