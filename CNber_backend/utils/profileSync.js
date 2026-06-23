const mongoose = require('mongoose')
const Order = require('../models/Order')
const User = require('../models/User')
const Driver = require('../models/Driver')
const CustomerProfile = require('../models/CustomerProfile')
const DriverProfile = require('../models/DriverProfile')
const { ORDER_STATUS } = Order
const { roundMoney } = require('./pricing')
const { resolveOrderPricingDisplay } = require('./fixedPricing')
const logger = require('./logger')

const TERMINAL_STATUSES = [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED]
const AIRPORT_KEYWORDS = /机场|airport|heathrow|gatwick|stansted|luton|city/i

function oid(value) {
  if (!value) return null
  if (value instanceof mongoose.Types.ObjectId) return value
  const id = value._id || value
  if (!mongoose.Types.ObjectId.isValid(String(id))) return null
  return new mongoose.Types.ObjectId(String(id))
}

function routeLabel(order, field) {
  if (field === 'from') {
    return String(
      order.routeFromLabel || order.pickupAirport || order.pickup || ''
    ).trim()
  }
  return String(
    order.routeToLabel || order.dropoffAirport || order.destination || ''
  ).trim()
}

function customerSpendCny(order) {
  const fixed = resolveOrderPricingDisplay(order)
  if (fixed?.customerPriceCny > 0) return roundMoney(fixed.customerPriceCny)
  if (order.customerPriceCny > 0) return roundMoney(order.customerPriceCny)
  if (order.totalAmount > 0 && order.exchangeRate > 0) {
    return roundMoney(order.totalAmount * order.exchangeRate)
  }
  return 0
}

function driverSettlementGbp(order) {
  const fixed = resolveOrderPricingDisplay(order)
  if (fixed?.driverPriceGbp > 0) return roundMoney(fixed.driverPriceGbp)
  const payout =
    order.driverPriceGbp ??
    order.priceBreakdown?.driverPayout ??
    order.driverSettlementAmount ??
    0
  return roundMoney(payout)
}

function driverSettlementCny(order) {
  const fixed = resolveOrderPricingDisplay(order)
  if (fixed?.driverSettlementCny > 0) return roundMoney(fixed.driverSettlementCny)
  if (order.driverSettlementCny > 0) return roundMoney(order.driverSettlementCny)
  const gbp = driverSettlementGbp(order)
  const rate = order.exchangeRate || fixed?.exchangeRate || 0
  if (gbp > 0 && rate > 0) return roundMoney(gbp * rate)
  return 0
}

function buildRouteMap(orders, fromKey, toKey) {
  const map = new Map()
  for (const o of orders) {
    const from = routeLabel(o, 'from') || String(o[fromKey] || '').trim()
    const to = routeLabel(o, 'to') || String(o[toKey] || '').trim()
    if (!from && !to) continue
    const key = `${from}→${to}`
    const usedAt = o.updatedAt || o.createdAt || new Date()
    const prev = map.get(key)
    if (prev) {
      prev.count += 1
      if (usedAt > prev.lastUsedAt) prev.lastUsedAt = usedAt
    } else {
      map.set(key, { from, to, count: 1, lastUsedAt: usedAt })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 20)
}

function vehicleClassCounts(orders) {
  const counts = new Map()
  for (const o of orders) {
    const vc = String(o.vehicleClass || '').trim()
    if (!vc) continue
    counts.set(vc, (counts.get(vc) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([vc]) => vc)
    .slice(0, 10)
}

function favoriteServiceTypeFromOrders(orders) {
  const counts = new Map()
  for (const o of orders) {
    const st = String(o.serviceType || 'ride').trim() || 'ride'
    counts.set(st, (counts.get(st) || 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return top ? top[0] : ''
}

function inferCustomerTags(stats, routes) {
  const tags = new Set()
  if (stats.completedOrders >= 5) tags.add('高频客户')
  const airportHit = routes.some(
    (r) => AIRPORT_KEYWORDS.test(r.from) || AIRPORT_KEYWORDS.test(r.to)
  )
  if (airportHit) tags.add('机场常客')
  return [...tags]
}

function inferDriverTags(orders, vehicleClass) {
  const tags = new Set()
  const routes = buildRouteMap(orders, 'pickup', 'destination')
  if (routes.some((r) => AIRPORT_KEYWORDS.test(r.from) || AIRPORT_KEYWORDS.test(r.to))) {
    tags.add('机场接送')
  }
  if (vehicleClass.includes('comfort_7') || vehicleClass.includes('7')) {
    tags.add('7座')
  }
  if (vehicleClass.includes('luxury') || vehicleClass.includes('business')) {
    tags.add('商务车')
  }
  return [...tags]
}

function mergeTags(existing, autoTags) {
  const set = new Set([...(existing || []), ...(autoTags || [])])
  return [...set]
}

async function aggregateCustomerStats(userId) {
  const uid = oid(userId)
  if (!uid) return null

  const baseMatch = { userId: uid, isDeleted: { $ne: true } }
  const [counts, orders] = await Promise.all([
    Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.COMPLETED] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.CANCELLED] }, 1, 0] }
          },
          lastOrderAt: { $max: '$createdAt' }
        }
      }
    ]),
    Order.find(baseMatch)
      .select(
        'status serviceType pickup destination routeFromLabel routeToLabel vehicleClass customerPriceCny totalAmount exchangeRate pricingMode pricingSource priceBreakdown quoteBreakdown driverPriceGbp driverSettlementCny createdAt updatedAt'
      )
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
  ])

  const row = counts[0] || {
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    lastOrderAt: null
  }

  const completed = orders.filter((o) => o.status === ORDER_STATUS.COMPLETED)
  const totalSpentCny = completed.reduce((sum, o) => sum + customerSpendCny(o), 0)
  const frequentRoutes = buildRouteMap(orders, 'pickup', 'destination')
  const preferredVehicleClasses = vehicleClassCounts(
    orders.filter((o) => TERMINAL_STATUSES.includes(o.status) || o.vehicleClass)
  )

  return {
    ...row,
    totalSpentCny: roundMoney(totalSpentCny),
    frequentRoutes,
    preferredVehicleClasses,
    favoriteServiceType: favoriteServiceTypeFromOrders(orders),
    autoTags: inferCustomerTags(row, frequentRoutes)
  }
}

async function aggregateDriverStats(driverUserId) {
  const uid = oid(driverUserId)
  if (!uid) return null

  const baseMatch = {
    $or: [{ driverId: uid }, { assignedDriver: uid }],
    isDeleted: { $ne: true }
  }

  const orders = await Order.find(baseMatch)
    .select(
      'status pickup destination routeFromLabel routeToLabel vehicleClass driverPriceGbp driverSettlementCny driverSettlementAmount exchangeRate pricingMode pricingSource priceBreakdown quoteBreakdown assignedAt createdAt updatedAt'
    )
    .sort({ createdAt: -1 })
    .limit(500)
    .lean()

  const assignedOrders = orders.filter((o) => o.driverId || o.assignedDriver)
  const completed = orders.filter((o) => o.status === ORDER_STATUS.COMPLETED)
  const cancelled = orders.filter((o) => o.status === ORDER_STATUS.CANCELLED)

  const totalAssignedOrders = assignedOrders.length
  const completedOrders = completed.length
  const cancelledOrders = cancelled.length

  const driverSettlementTotalGbp = completed.reduce(
    (sum, o) => sum + driverSettlementGbp(o),
    0
  )
  const driverSettlementTotalCny = completed.reduce(
    (sum, o) => sum + driverSettlementCny(o),
    0
  )

  const preferredRoutes = buildRouteMap(completed, 'pickup', 'destination')
  const vehicleClass = vehicleClassCounts(completed)[0] || ''

  return {
    totalAssignedOrders,
    completedOrders,
    cancelledOrders,
    driverSettlementTotalGbp: roundMoney(driverSettlementTotalGbp),
    driverSettlementTotalCny: roundMoney(driverSettlementTotalCny),
    preferredRoutes,
    vehicleClass,
    autoTags: inferDriverTags(completed, vehicleClass)
  }
}

function extractServiceAreas(orders, driverDoc, user) {
  const areas = new Set(driverDoc?.serviceAreas || [])
  for (const o of orders) {
    const from = routeLabel(o, 'from')
    const to = routeLabel(o, 'to')
    for (const part of [from, to]) {
      const city = String(part || '')
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)[0]
      if (city && city.length <= 40) areas.add(city)
    }
  }
  const addr = user?.driverProfile?.address
  if (addr) areas.add(String(addr).trim())
  return [...areas].slice(0, 30)
}

/**
 * 从订单聚合刷新客户画像（幂等）
 */
async function syncCustomerProfileFromOrder(order) {
  const userId = oid(order?.userId)
  if (!userId) return null

  const [user, stats, existing] = await Promise.all([
    User.findById(userId).select('phone passengerProfile status').lean(),
    aggregateCustomerStats(userId),
    CustomerProfile.findOne({ userId }).select('tags notes marketingConsent marketingConsentAt marketingOptOutAt customerType').lean()
  ])
  if (!stats) return null

  const doc = {
    userId,
    phone: user?.phone || '',
    name: user?.passengerProfile?.realName || '',
    email: user?.passengerProfile?.email || '',
    frequentRoutes: stats.frequentRoutes,
    preferredVehicleClasses: stats.preferredVehicleClasses,
    totalOrders: stats.totalOrders,
    completedOrders: stats.completedOrders,
    cancelledOrders: stats.cancelledOrders,
    totalSpentCny: stats.totalSpentCny,
    lastOrderAt: stats.lastOrderAt,
    favoriteServiceType: stats.favoriteServiceType || '',
    tags: mergeTags(existing?.tags, stats.autoTags),
    notes: existing?.notes || '',
    customerType: existing?.customerType || 'unknown',
    marketingConsent: existing?.marketingConsent ?? false,
    marketingConsentAt: existing?.marketingConsentAt || null,
    marketingOptOutAt: existing?.marketingOptOutAt || null
  }

  return CustomerProfile.findOneAndUpdate(
    { userId },
    { $set: doc },
    { upsert: true, new: true }
  ).lean()
}

/**
 * 从订单聚合刷新司机画像（幂等）
 */
async function syncDriverProfileFromOrder(order) {
  const driverUserId = oid(order?.driverId || order?.assignedDriver)
  if (!driverUserId) return null

  const [user, driverDoc, stats, existing] = await Promise.all([
    User.findById(driverUserId).select('phone driverProfile').lean(),
    Driver.findOne({ userId: driverUserId }).lean(),
    aggregateDriverStats(driverUserId),
    DriverProfile.findOne({ userId: driverUserId })
      .select('tags notes availabilityNotes riskFlags onTimeRate customerRatingAvg')
      .lean()
  ])
  if (!stats) return null

  const orders = await Order.find({
    $or: [{ driverId: driverUserId }, { assignedDriver: driverUserId }],
    isDeleted: { $ne: true }
  })
    .select('pickup destination routeFromLabel routeToLabel')
    .limit(100)
    .lean()

  const doc = {
    userId: driverUserId,
    driverId: driverDoc?._id || null,
    phone: user?.phone || driverDoc?.phone || '',
    name: user?.driverProfile?.realName || '',
    vehicleClass:
      stats.vehicleClass ||
      user?.driverProfile?.vehicle?.model ||
      driverDoc?.vehicleModel ||
      '',
    carPlate:
      driverDoc?.carPlate ||
      driverDoc?.vehiclePlate ||
      user?.driverProfile?.vehicle?.plateNo ||
      user?.driverProfile?.vehiclePlate ||
      '',
    carModel: driverDoc?.vehicleModel || user?.driverProfile?.vehicle?.model || '',
    serviceArea: extractServiceAreas(orders, driverDoc, user),
    preferredRoutes: stats.preferredRoutes,
    totalAssignedOrders: stats.totalAssignedOrders,
    completedOrders: stats.completedOrders,
    cancelledOrders: stats.cancelledOrders,
    driverSettlementTotalGbp: stats.driverSettlementTotalGbp,
    driverSettlementTotalCny: stats.driverSettlementTotalCny,
    onTimeRate: existing?.onTimeRate ?? null,
    customerRatingAvg: existing?.customerRatingAvg ?? null,
    tags: mergeTags(existing?.tags, stats.autoTags),
    availabilityNotes: existing?.availabilityNotes || '',
    riskFlags: existing?.riskFlags || [],
    notes: existing?.notes || ''
  }

  return DriverProfile.findOneAndUpdate(
    { userId: driverUserId },
    { $set: doc },
    { upsert: true, new: true }
  ).lean()
}

async function syncProfilesAfterOrderCompleted(order) {
  await syncCustomerProfileFromOrder(order)
  await syncDriverProfileFromOrder(order)
}

async function syncProfilesAfterOrderAssigned(order) {
  await syncDriverProfileFromOrder(order)
  await syncCustomerProfileFromOrder(order)
}

async function syncProfilesAfterOrderCancelled(order) {
  await syncCustomerProfileFromOrder(order)
  await syncDriverProfileFromOrder(order)
}

/** 异步触发画像同步，失败仅记日志，不阻断主流程 */
function fireProfileSync(fn, order, context = '') {
  const label = context || fn.name || 'profileSync'
  Promise.resolve()
    .then(() => fn(order))
    .catch((err) => {
      logger.error(`profile sync failed [${label}]: ${err.message}`, {
        stack: err.stack,
        orderId: order?._id ? String(order._id) : ''
      })
    })
}

module.exports = {
  syncCustomerProfileFromOrder,
  syncDriverProfileFromOrder,
  syncProfilesAfterOrderCompleted,
  syncProfilesAfterOrderAssigned,
  syncProfilesAfterOrderCancelled,
  fireProfileSync,
  aggregateCustomerStats,
  aggregateDriverStats
}
