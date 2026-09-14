const SystemSetting = require('../models/SystemSetting')
const { roundMoney, totalPriceOf } = require('./pricing')

const GBP_CNY_RATE_KEY = 'GBP_CNY_RATE'
const DEFAULT_GBP_CNY_RATE = 10

function normalizeRate(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return roundMoney(n)
}

function gbpToCny(gbp, rate) {
  const r = normalizeRate(rate) || DEFAULT_GBP_CNY_RATE
  const amount = Number(gbp || 0)
  return roundMoney(amount * r)
}

async function getGbpCnyRate() {
  const row = await SystemSetting.findOne({ key: GBP_CNY_RATE_KEY }).lean()
  const parsed = normalizeRate(row?.value)
  return parsed ?? DEFAULT_GBP_CNY_RATE
}

async function setGbpCnyRate(rate, adminUserId) {
  const value = normalizeRate(rate)
  if (value == null) {
    const e = new Error('汇率必须为正数')
    e.code = 400
    throw e
  }
  await SystemSetting.findOneAndUpdate(
    { key: GBP_CNY_RATE_KEY },
    {
      $set: {
        key: GBP_CNY_RATE_KEY,
        value,
        updatedBy: adminUserId || null,
        updatedAt: new Date()
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()
  return value
}

function driverPayoutGbp(order = {}) {
  if (order.driverPriceGbp != null) return roundMoney(order.driverPriceGbp)
  const breakdown = order.priceBreakdown || order.quoteBreakdown || {}
  const total = totalPriceOf(order)
  return roundMoney(breakdown.driverPayout ?? total * 0.75)
}

function platformProfitGbp(order = {}) {
  const breakdown = order.priceBreakdown || order.quoteBreakdown || {}
  const total = totalPriceOf(order)
  const driver = driverPayoutGbp(order)
  return roundMoney(breakdown.platformProfit ?? total - driver)
}

/**
 * 展示层补充：只透传订单上已存在的 CNY 字段。
 * 禁止用 GBP × exchangeRate 发明 customerPriceCny / driverSettlementCny。
 * 历史订单缺 CNY 时保持缺省，由 attachSystemCurrency 输出 null。
 */
function enrichOrderWithExchangeSync(order, rate) {
  if (!order || typeof order !== 'object') return order
  const storedRate = normalizeRate(order.exchangeRate)
  const { resolveOrderPricingDisplay } = require('./fixedPricing')
  const fixedDisplay = resolveOrderPricingDisplay(order, storedRate || rate)
  if (!fixedDisplay) {
    return order
  }

  const out = { ...order }
  if (out.exchangeRate == null && fixedDisplay.exchangeRate != null) {
    out.exchangeRate = fixedDisplay.exchangeRate
  }
  if (out.customerPriceCny == null && Number(fixedDisplay.customerPriceCny) > 0) {
    out.customerPriceCny = fixedDisplay.customerPriceCny
  }
  if (out.driverSettlementCny == null && Number(fixedDisplay.driverSettlementCny) > 0) {
    out.driverSettlementCny = fixedDisplay.driverSettlementCny
  }
  if (out.platformProfitCny == null && Number(fixedDisplay.platformProfitCny) > 0) {
    out.platformProfitCny = fixedDisplay.platformProfitCny
  }
  return out
}

async function enrichOrderWithExchange(order) {
  const rate = await getGbpCnyRate()
  return enrichOrderWithExchangeSync(order, rate)
}

async function enrichOrdersWithExchange(orders) {
  const list = Array.isArray(orders) ? orders : []
  if (!list.length) return list
  const rate = await getGbpCnyRate()
  return list.map((o) => enrichOrderWithExchangeSync(o, rate))
}

module.exports = {
  GBP_CNY_RATE_KEY,
  DEFAULT_GBP_CNY_RATE,
  gbpToCny,
  getGbpCnyRate,
  setGbpCnyRate,
  driverPayoutGbp,
  platformProfitGbp,
  enrichOrderWithExchangeSync,
  enrichOrderWithExchange,
  enrichOrdersWithExchange
}
