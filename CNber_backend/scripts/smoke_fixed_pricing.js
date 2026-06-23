#!/usr/bin/env node
const assert = require('assert')
const { calculateFixedPrice } = require('../utils/fixedPricing')

const result = calculateFixedPrice('point', 9, {
  customerPriceCny: 900,
  driverPriceGbp: 80
})

assert.strictEqual(result.customerPriceCny, 900)
assert.strictEqual(result.driverPriceGbp, 80)
assert.strictEqual(result.exchangeRate, 9)
assert.strictEqual(result.driverSettlementCny, 720)
assert.strictEqual(result.platformProfitCny, 180)
assert.strictEqual(result.pricingMode, 'fixed')

const pickup = calculateFixedPrice('pickup', 9, {
  customerPriceCny: 900,
  driverPriceGbp: 75
})
assert.strictEqual(pickup.driverSettlementCny, 675)
assert.strictEqual(pickup.platformProfitCny, 225)

console.log('smoke_fixed_pricing ok', result)
