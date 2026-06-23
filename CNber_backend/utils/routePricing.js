const RoutePricingRule = require('../models/RoutePricingRule')
const { VEHICLE_CLASS_LABELS } = require('../models/RoutePricingRule')
const {
  calculateFixedPrice,
  calculateFixedPriceForService,
  buildFixedQuotePatch,
  normalizeServiceType
} = require('./fixedPricing')
const { getGbpCnyRate } = require('./exchangeRate')
const { roundMoney } = require('./pricing')
const catalog = require('./catalogConfig')

const REVERSE_MATCH_TYPES = new Set(['point', 'ride'])

function normalizeLocationKey(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeVehicleClassSync(vehicleClass) {
  const v = String(vehicleClass || 'standard_5')
    .trim()
    .toLowerCase()
  if (catalog.LEGACY_VEHICLE_CLASSES.includes(v)) return v
  return v || 'standard_5'
}

function vehicleLabelOfSync(vehicleClass, fallback = '') {
  const key = normalizeVehicleClassSync(vehicleClass)
  return fallback || VEHICLE_CLASS_LABELS[key] || key
}

async function normalizeVehicleClass(vehicleClass) {
  return catalog.normalizeVehicleClass(vehicleClass)
}

async function vehicleLabelOf(vehicleClass, fallback = '') {
  const key = await normalizeVehicleClass(vehicleClass)
  const label = await catalog.vehicleLabelOf(key, fallback)
  return label || vehicleLabelOfSync(key, fallback)
}

/** 查找路线报价（精确 → 反向[point/ride]） */
async function findRoutePricing({ serviceType, from, to, vehicleClass }) {
  const svc = normalizeServiceType(serviceType)
  const fromKey = normalizeLocationKey(from)
  const toKey = normalizeLocationKey(to)
  const vc = await normalizeVehicleClass(vehicleClass)
  if (!fromKey || !toKey) return null

  const baseQuery = { serviceType: svc, vehicleClass: vc, enabled: true }

  let rule = await RoutePricingRule.findOne({
    ...baseQuery,
    fromKey,
    toKey
  }).lean()

  if (!rule && REVERSE_MATCH_TYPES.has(svc)) {
    rule = await RoutePricingRule.findOne({
      ...baseQuery,
      fromKey: toKey,
      toKey: fromKey
    }).lean()
  }

  return rule
}

/**
 * 计算报价：优先 route_fixed，否则 service_default（FixedPricingRule）
 */
async function calculateRoutePrice({
  serviceType,
  from,
  to,
  vehicleClass,
  exchangeRate
}) {
  const svc = normalizeServiceType(serviceType)
  const vc = await normalizeVehicleClass(vehicleClass)
  const rate = exchangeRate ?? (await getGbpCnyRate())
  const rule = await findRoutePricing({ serviceType: svc, from, to, vehicleClass: vc })

  if (rule) {
    const priced = calculateFixedPrice(svc, rate, {
      customerPriceCny: rule.customerPriceCny,
      driverPriceGbp: rule.driverPriceGbp
    })
    return {
      ...priced,
      pricingSource: 'route_fixed',
      pricingMode: 'fixed',
      routeRuleId: rule._id,
      fromLabel: rule.fromLabel,
      toLabel: rule.toLabel,
      fromKey: rule.fromKey,
      toKey: rule.toKey,
      vehicleClass: rule.vehicleClass,
      vehicleLabel: rule.vehicleLabel || (await vehicleLabelOf(rule.vehicleClass))
    }
  }

  const fallback = await calculateFixedPriceForService(svc, rate)
  if (!fallback) return null
  return {
    ...fallback,
    pricingSource: 'service_default',
    pricingMode: 'fixed',
    vehicleClass: vc,
    vehicleLabel: await vehicleLabelOf(vc)
  }
}

function buildRouteQuotePatch(priced) {
  const patch = buildFixedQuotePatch(priced)
  return {
    ...patch,
    pricingSource: priced.pricingSource,
    pricingMode: 'fixed',
    quoteSource: priced.pricingSource === 'route_fixed' ? 'route_fixed' : 'fixed',
    vehicleClass: priced.vehicleClass,
    vehicleLabel: priced.vehicleLabel,
    routeFromLabel: priced.fromLabel || '',
    routeToLabel: priced.toLabel || '',
    quoteBreakdown: {
      ...patch.quoteBreakdown,
      type: priced.pricingSource === 'route_fixed' ? 'route_fixed_v1' : 'fixed_v1',
      pricingSource: priced.pricingSource,
      routeRuleId: priced.routeRuleId || null,
      fromLabel: priced.fromLabel || '',
      toLabel: priced.toLabel || '',
      vehicleClass: priced.vehicleClass,
      vehicleLabel: priced.vehicleLabel
    }
  }
}

async function buildRouteOrderQuote(orderOrParams) {
  const isOrder = orderOrParams && (orderOrParams.pickup || orderOrParams.destination)
  const params = isOrder
    ? {
        serviceType: orderOrParams.serviceType,
        from: orderOrParams.pickup,
        to: orderOrParams.destination,
        vehicleClass: orderOrParams.vehicleClass || 'standard_5'
      }
    : orderOrParams

  const priced = await calculateRoutePrice(params)
  if (!priced) return null
  return buildRouteQuotePatch(priced)
}

module.exports = {
  normalizeLocationKey,
  normalizeVehicleClass,
  normalizeVehicleClassSync,
  vehicleLabelOf,
  vehicleLabelOfSync,
  findRoutePricing,
  calculateRoutePrice,
  buildRouteQuotePatch,
  buildRouteOrderQuote,
  VEHICLE_CLASS_LABELS,
  REVERSE_MATCH_TYPES
}
