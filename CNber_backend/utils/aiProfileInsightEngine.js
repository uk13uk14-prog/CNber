const Order = require('../models/Order')
const SupportTicket = require('../models/SupportTicket')
const { ORDER_STATUS } = Order

const INSIGHT_VERSION = 1
const CUSTOMER_WINDOW_DAYS = 90
const DRIVER_WINDOW_DAYS = 30

const AIRPORT_KEYWORDS = [
  'heathrow',
  'gatwick',
  'stansted',
  'luton',
  'city airport',
  '希思罗',
  '盖特威克',
  '斯坦斯特德',
  '卢顿',
  '机场',
  'airport'
]

const LONDON_KEYWORDS = ['london', '伦敦', 'camden', 'westminster', 'kings cross', 'paddington']

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function textHasKeyword(text, keywords) {
  const s = String(text || '').toLowerCase()
  return keywords.some((k) => s.includes(k.toLowerCase()))
}

function orderRouteText(order) {
  return [
    order.routeFromLabel,
    order.routeToLabel,
    order.pickup,
    order.destination,
    order.pickupAirport,
    order.dropoffAirport,
    order.airport,
    order.flightAirport
  ]
    .filter(Boolean)
    .join(' ')
}

function isAirportOrder(order) {
  if (['pickup', 'dropoff'].includes(String(order.serviceType || '').toLowerCase())) return true
  return textHasKeyword(orderRouteText(order), AIRPORT_KEYWORDS)
}

function isLondonRelated(order) {
  return textHasKeyword(orderRouteText(order), LONDON_KEYWORDS)
}

function orderAmountCny(order) {
  const n = Number(order.payableAmountCny ?? order.customerPriceCny ?? order.amount ?? 0)
  return Number.isFinite(n) ? n : 0
}

function countByField(items, getter) {
  const map = new Map()
  for (const item of items) {
    const key = getter(item) || 'unknown'
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

function topRouteLabel(orders) {
  const map = new Map()
  for (const o of orders) {
    const from = String(o.routeFromLabel || o.pickupAirport || o.pickup || '').trim() || '?'
    const to = String(o.routeToLabel || o.dropoffAirport || o.destination || '').trim() || '?'
    const key = `${from}→${to}`
    map.set(key, (map.get(key) || 0) + 1)
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
  return sorted[0] ? { label: sorted[0][0], count: sorted[0][1] } : null
}

function airportLabelFromOrders(orders) {
  for (const o of orders) {
    const text = orderRouteText(o)
    if (textHasKeyword(text, ['heathrow', '希思罗'])) return '希思罗机场'
    if (textHasKeyword(text, ['gatwick', '盖特威克'])) return '盖特威克机场'
    if (textHasKeyword(text, ['stansted', '斯坦斯特德'])) return '斯坦斯特德机场'
    if (textHasKeyword(text, ['luton', '卢顿'])) return '卢顿机场'
    if (isAirportOrder(o)) return '机场接送'
  }
  return ''
}

function formatAvgMoney(n) {
  const v = Math.round(Number(n) || 0)
  return `¥${v}`
}

async function loadCustomerOrders(userId, since) {
  return Order.find({
    userId,
    createdAt: { $gte: since }
  })
    .select(
      'status serviceType pickup destination routeFromLabel routeToLabel pickupAirport dropoffAirport airport flightAirport couponCode payableAmountCny customerPriceCny amount createdAt'
    )
    .lean()
}

async function loadDriverOrders(driverUserId, since) {
  return Order.find({
    $or: [{ driverId: driverUserId }, { assignedDriver: driverUserId }],
    createdAt: { $gte: since }
  })
    .select(
      'status serviceType pickup destination routeFromLabel routeToLabel pickupAirport dropoffAirport airport createdAt'
    )
    .lean()
}

async function countCustomerComplaints(userId) {
  return SupportTicket.countDocuments({
    requesterUserId: userId,
    type: 'complaint'
  })
}

async function countDriverComplaints(driverUserId, driverPhone) {
  const q = {
    type: { $in: ['complaint', 'driver_issue'] },
    $or: [{ requesterUserId: driverUserId }]
  }
  if (driverPhone) q.$or.push({ requesterPhone: driverPhone })
  return SupportTicket.countDocuments(q)
}

async function countDriverTickets(driverUserId, driverPhone) {
  const q = {
    $or: [{ requesterUserId: driverUserId }]
  }
  if (driverPhone) q.$or.push({ requesterPhone: driverPhone })
  return SupportTicket.countDocuments(q)
}

/** 客户画像规则引擎 V1 */
async function generateCustomerInsight(profile) {
  const userId = profile.userId
  const since = daysAgo(CUSTOMER_WINDOW_DAYS)
  const orders = await loadCustomerOrders(userId, since)
  const completed = orders.filter((o) => o.status === ORDER_STATUS.COMPLETED)
  const cancelled = orders.filter((o) => o.status === ORDER_STATUS.CANCELLED)
  const couponOrders = orders.filter((o) => String(o.couponCode || '').trim())
  const airportOrders = orders.filter(isAirportOrder)
  const complaints = await countCustomerComplaints(userId)

  const spent = completed.reduce((sum, o) => sum + orderAmountCny(o), 0)
  const avgSpent = completed.length ? spent / completed.length : 0
  const topRoute = topRouteLabel(completed.length ? completed : orders)
  const airportLabel = airportLabelFromOrders(airportOrders.length ? airportOrders : orders)
  const serviceTypes = countByField(completed, (o) => o.serviceType || 'ride')

  const tags = []
  if (profile.customerType === 'student') tags.push('留学生')
  if (profile.customerType === 'business') tags.push('商务客户')
  if (airportOrders.length >= 1 || airportLabel) tags.push('机场用户')
  if (completed.length >= 5 || profile.completedOrders >= 10) tags.push('高频客户')
  if (couponOrders.length >= 1) tags.push('优惠券用户')
  if (profile.customerType === 'family') tags.push('家庭出行')
  if (!tags.length) tags.push('普通客户')

  const summaryParts = [
    `过去${CUSTOMER_WINDOW_DAYS}天完成${completed.length}单`,
    cancelled.length ? `取消${cancelled.length}单` : null,
    airportLabel
      ? `主要使用${airportLabel}接送`
      : topRoute
        ? `常用路线${topRoute.label}（${topRoute.count}次）`
        : null,
    completed.length ? `平均消费${formatAvgMoney(avgSpent)}` : null,
    complaints ? `投诉记录${complaints}条` : '无投诉记录'
  ].filter(Boolean)

  const recommendations = []
  if (tags.includes('机场用户')) recommendations.push('机场优惠券')
  if (tags.includes('留学生') && tags.includes('机场用户')) recommendations.push('暑期接机活动')
  if (tags.includes('高频客户')) recommendations.push('忠诚客户专属回馈')
  if (couponOrders.length === 0 && completed.length >= 2) recommendations.push('首单复购优惠券')
  if (serviceTypes[0] && serviceTypes[0][0] === 'charter') recommendations.push('包车套餐推荐')
  if (!recommendations.length) recommendations.push('保持常规服务跟进')

  let riskLevel = 'none'
  if (complaints >= 3 || cancelled.length >= 3) riskLevel = 'high'
  else if (complaints >= 1 || cancelled.length >= 2) riskLevel = 'medium'
  else if (complaints === 0 && cancelled.length === 0) riskLevel = 'low'

  return {
    profileType: 'customer',
    summary: summaryParts.join('，') + '。',
    tags: [...new Set(tags)],
    riskLevel,
    recommendations: [...new Set(recommendations)],
    version: INSIGHT_VERSION
  }
}

/** 司机画像规则引擎 V1 */
async function generateDriverInsight(profile) {
  const driverUserId = profile.userId
  const since = daysAgo(DRIVER_WINDOW_DAYS)
  const orders = await loadDriverOrders(driverUserId, since)
  const completed = orders.filter((o) => o.status === ORDER_STATUS.COMPLETED)
  const cancelled = orders.filter((o) => o.status === ORDER_STATUS.CANCELLED)
  const assigned = orders.length
  const airportOrders = orders.filter(isAirportOrder)
  const londonOrders = orders.filter(isLondonRelated)
  const complaints = await countDriverComplaints(driverUserId, profile.phone)
  const tickets = await countDriverTickets(driverUserId, profile.phone)

  const cancelRate = assigned ? cancelled.length / assigned : 0
  const onTimeRate = profile.onTimeRate
  const hasOnTime = onTimeRate != null && Number.isFinite(Number(onTimeRate))

  const tags = []
  if (airportOrders.length >= Math.max(1, Math.ceil(assigned * 0.3))) tags.push('机场专长')
  if (
    (profile.serviceArea || []).some((a) => textHasKeyword(a, LONDON_KEYWORDS)) ||
    londonOrders.length >= Math.max(1, Math.ceil(assigned * 0.3))
  ) {
    tags.push('伦敦区域')
  }
  if (completed.length >= 20) tags.push('高产司机')
  if (hasOnTime && Number(onTimeRate) >= 0.9) tags.push('准时率高')
  if (profile.riskFlags?.length) tags.push('需关注')
  if (!tags.length) tags.push('常规司机')

  let riskLevel = 'low'
  if (complaints >= 2 || cancelRate >= 0.25 || (profile.riskFlags?.length || 0) >= 2) {
    riskLevel = 'high'
  } else if (complaints >= 1 || cancelRate >= 0.15 || (profile.riskFlags?.length || 0) >= 1) {
    riskLevel = 'medium'
  } else if (complaints === 0 && cancelRate < 0.1) {
    riskLevel = 'low'
  }

  const summaryParts = [
    `近${DRIVER_WINDOW_DAYS}天完成${completed.length}单`,
    assigned ? `派单${assigned}单` : null,
    cancelled.length ? `取消${cancelled.length}单` : null,
    hasOnTime ? `准时率${Math.round(Number(onTimeRate) * 100)}%` : tags.includes('准时率高') ? '准时率高' : null,
    complaints ? `投诉${complaints}条` : '无投诉',
    tickets ? `客服工单${tickets}条` : null
  ].filter(Boolean)

  const recommendations = []
  if (tags.includes('机场专长')) recommendations.push('优先分配接机订单')
  if (tags.includes('伦敦区域')) recommendations.push('优先分配伦敦市区订单')
  if (riskLevel === 'low' && completed.length >= 15) recommendations.push('可纳入优质司机池')
  if (riskLevel === 'high') recommendations.push('建议人工复核近期服务记录')
  if (cancelRate >= 0.15) recommendations.push('关注取消原因并做运营辅导')
  if (!recommendations.length) recommendations.push('维持当前派单策略')

  return {
    profileType: 'driver',
    summary: summaryParts.join('，') + '。',
    tags: [...new Set(tags)],
    riskLevel,
    recommendations: [...new Set(recommendations)],
    version: INSIGHT_VERSION
  }
}

module.exports = {
  INSIGHT_VERSION,
  generateCustomerInsight,
  generateDriverInsight,
  /** 纯函数导出供 smoke 测试 */
  _internals: {
    textHasKeyword,
    isAirportOrder,
    orderAmountCny,
    daysAgo
  }
}
