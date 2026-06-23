#!/usr/bin/env node
const assert = require('assert')
const {
  gbpToCny,
  enrichOrderWithExchangeSync,
  DEFAULT_GBP_CNY_RATE
} = require('../utils/exchangeRate')

assert.strictEqual(gbpToCny(832.5, 10), 8325)
assert.strictEqual(gbpToCny(624.38, 10), 6243.8)

const enriched = enrichOrderWithExchangeSync(
  {
    amount: 832.5,
    priceBreakdown: { totalPrice: 832.5, driverPayout: 624.38, platformProfit: 208.12 }
  },
  10
)
assert.strictEqual(enriched.exchangeRate, 10)
assert.strictEqual(enriched.customerPriceCny, 8325)
assert.strictEqual(enriched.driverPriceCny, 6243.8)
assert.strictEqual(enriched.platformProfitCny, 2081.2)
assert.strictEqual(enriched.amount, 832.5)

console.log('smoke_exchange_rate ok', { default: DEFAULT_GBP_CNY_RATE })
