const FixedPricingRule = require('../models/FixedPricingRule')
const { roundMoney, buildPaymentFields } = require('./pricing')
const { getGbpCnyRate, DEFAULT_GBP_CNY_RATE } = require('./exchangeRate')
const { LEGACY_SERVICE_TYPES } = require('./catalogConfig')

const DEFAULT_BY_TYPE = Object.fromEntries(
  FixedPricingRule.DEFAULT_FIXED_RULES.map((r) => [r.serviceType, r])
)

function normalizeServiceType(serviceType) {
  const s = String(serviceType || 'ride').trim().toLowerCase()
  if (!s) return 'ride'
  if (LEGACY_SERVICE_TYPES.includes(s)) return s
  return s
}

function normalizeRate(rate) {
  const n = Number(rate)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_GBP_CNY_RATE
  return roundMoney(n)
}

/** 纯计算（不访问 DB） */
function calculateFixedPrice(serviceType, exchangeRate, ruleInput = {}) {
  const svc = normalizeServiceType(serviceType)
  const defaults = DEFAULT_BY_TYPE[svc] || DEFAULT_BY_TYPE.ride
  const customerPriceCny = roundMoney(
    ruleInput.customerPriceCny ?? defaults.customerPriceCny
  )
  const driverPriceGbp = roundMoney(ruleInput.driverPriceGbp ?? defaults.driverPriceGbp)
  const rate = normalizeRate(exchangeRate)
  const driverSettlementCny = roundMoney(driverPriceGbp * rate)
  const platformProfitCny = roundMoney(customerPriceCny - driverSettlementCny)
  const customerPriceGbp = roundMoney(customerPriceCny / rate)

  return {
    serviceType: svc,
    pricingMode: 'fixed',
    customerPriceCny,
    driverPriceGbp,
    customerPriceGbp,
    exchangeRate: rate,
    driverSettlementCny,
    platformProfitCny
  }
}

async function getFixedPricingRule(serviceType) {
  await FixedPricingRule.ensureDefaultRules()
  const svc = normalizeServiceType(serviceType)
  const row = await FixedPricingRule.findOne({ serviceType: svc }).lean()
  if (!row) return null
  return row
}

async function calculateFixedPriceForService(serviceType, exchangeRateOptional) {
  const rule = await getFixedPricingRule(serviceType)
  if (!rule || rule.enabled === false) return null
  const rate = exchangeRateOptional ?? (await getGbpCnyRate())
  return calculateFixedPrice(serviceType, rate, rule)
}

function buildFixedQuotePatch(fixed) {
  const customerGbp = fixed.customerPriceGbp
  const driverGbp = fixed.driverPriceGbp
  const breakdown = {
    type: 'fixed_v1',
    pricingMode: 'fixed',
    serviceType: fixed.serviceType,
    customerPriceCny: fixed.customerPriceCny,
    driverPriceGbp: fixed.driverPriceGbp,
    customerPriceGbp: customerGbp,
    exchangeRate: fixed.exchangeRate,
    driverSettlementCny: fixed.driverSettlementCny,
    platformProfitCny: fixed.platformProfitCny,
    totalPrice: customerGbp,
    driverPayout: driverGbp,
    platformProfit: roundMoney(customerGbp - driverGbp)
  }

  return {
    amount: customerGbp,
    pricingMode: 'fixed',
    customerPriceCny: fixed.customerPriceCny,
    driverPriceGbp: fixed.driverPriceGbp,
    exchangeRate: fixed.exchangeRate,
    driverSettlementCny: fixed.driverSettlementCny,
    platformProfitCny: fixed.platformProfitCny,
    quoteSource: 'fixed',
    quoteBreakdown: breakdown,
    priceBreakdown: {
      basePrice: customerGbp,
      nightFee: 0,
      waitingFee: 0,
      childSeatFee: 0,
      meetGreetFee: 0,
      totalPrice: customerGbp,
      driverPayout: driverGbp,
      platformProfit: roundMoney(customerGbp - driverGbp)
    },
    driverSettlementAmount: driverGbp,
    totalAmount: fixed.customerPriceCny,
    ...buildPaymentFields(customerGbp)
  }
}

async function buildFixedOrderQuote(serviceType, exchangeRateOptional) {
  const fixed = await calculateFixedPriceForService(serviceType, exchangeRateOptional)
  if (!fixed) return null
  return buildFixedQuotePatch(fixed)
}

function firstStoredCny(...values) {
  for (const raw of values) {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return roundMoney(n)
  }
  return null
}

/** 订单展示层：只读取已存 CNY，禁止 GBP×汇率猜算 */
function resolveOrderPricingDisplay(order = {}, rateFallback) {
  const exchangeRate = normalizeRate(order.exchangeRate ?? rateFallback)
  const pricingSource = order.pricingSource || order.quoteBreakdown?.pricingSource || ''
  const isFixed =
    order.pricingMode === 'fixed' ||
    order.quoteBreakdown?.pricingMode === 'fixed' ||
    ['route_fixed', 'service_default', 'fixed'].includes(pricingSource)

  if (!isFixed) return null

  const customerPriceCny = firstStoredCny(
    order.customerPriceCny,
    order.quoteBreakdown?.customerPriceCny
  )
  const driverPriceGbp = roundMoney(
    order.driverPriceGbp ??
      order.priceBreakdown?.driverPayout ??
      order.quoteBreakdown?.driverPriceGbp ??
      0
  )
  const driverSettlementCny = firstStoredCny(
    order.driverSettlementCny,
    order.quoteBreakdown?.driverSettlementCny
  )
  const platformProfitCny = firstStoredCny(
    order.platformProfitCny,
    order.quoteBreakdown?.platformProfitCny
  )
  const customerPriceGbp = roundMoney(
    order.amount ?? (customerPriceCny != null ? customerPriceCny / exchangeRate : 0)
  )
  return {
    pricingMode: 'fixed',
    pricingSource: pricingSource || 'fixed',
    exchangeRate,
    customerPriceCny,
    customerPriceGbp,
    driverPriceGbp,
    driverSettlementCny,
    platformProfitCny,
    driverPriceCny: driverSettlementCny
  }
}

module.exports = {
  normalizeServiceType,
  calculateFixedPrice,
  getFixedPricingRule,
  calculateFixedPriceForService,
  buildFixedQuotePatch,
  buildFixedOrderQuote,
  resolveOrderPricingDisplay
}
