#!/usr/bin/env node
const assert = require('assert')
const {
  gbpToCny,
  enrichOrderWithExchangeSync,
  DEFAULT_GBP_CNY_RATE
} = require('../utils/exchangeRate')
const { attachSystemCurrency } = require('../utils/orderMoneyCny')

assert.strictEqual(gbpToCny(832.5, 10), 8325)
assert.strictEqual(gbpToCny(624.38, 10), 6243.8)

const legacy = enrichOrderWithExchangeSync(
  {
    amount: 832.5,
    priceBreakdown: { totalPrice: 832.5, driverPayout: 624.38, platformProfit: 208.12 }
  },
  10
)
assert.strictEqual(legacy.amount, 832.5)
assert.ok(legacy.customerPriceCny == null)
assert.ok(legacy.driverSettlementCny == null)
assert.ok(legacy.driverPriceCny == null)

const presentedLegacy = attachSystemCurrency(legacy)
assert.strictEqual(presentedLegacy.displayCustomerPriceCny, null)
assert.strictEqual(presentedLegacy.displayDriverSettlementCny, null)
assert.strictEqual(presentedLegacy.currency, 'CNY')
assert.strictEqual(presentedLegacy.amount, 832.5)

const fixed = enrichOrderWithExchangeSync(
  {
    amount: 90,
    customerPriceCny: 900,
    driverPriceGbp: 75,
    driverSettlementCny: 750,
    exchangeRate: 10,
    pricingMode: 'fixed',
    pricingSource: 'service_default'
  },
  10
)
const presentedFixed = attachSystemCurrency(fixed)
assert.strictEqual(presentedFixed.displayCustomerPriceCny, 900)
assert.strictEqual(presentedFixed.displayDriverSettlementCny, 750)
assert.strictEqual(presentedFixed.amount, 90)

console.log('smoke_exchange_rate ok', { default: DEFAULT_GBP_CNY_RATE })
