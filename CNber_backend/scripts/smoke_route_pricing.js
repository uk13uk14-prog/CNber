#!/usr/bin/env node
const assert = require('assert')
const { normalizeLocationKey } = require('../utils/routePricing')
const { calculateFixedPrice } = require('../utils/fixedPricing')

assert.strictEqual(normalizeLocationKey('London'), 'london')
assert.strictEqual(normalizeLocationKey('Heathrow T5'), 'heathrow-t5')
assert.strictEqual(normalizeLocationKey('Central London'), 'central-london')

const route = calculateFixedPrice('point', 9, {
  customerPriceCny: 1600,
  driverPriceGbp: 120
})
assert.strictEqual(route.customerPriceCny, 1600)
assert.strictEqual(route.driverPriceGbp, 120)
assert.strictEqual(route.driverSettlementCny, 1080)
assert.strictEqual(route.platformProfitCny, 520)

const fallback = calculateFixedPrice('point', 9, {
  customerPriceCny: 900,
  driverPriceGbp: 80
})
assert.strictEqual(fallback.platformProfitCny, 180)

console.log('smoke_route_pricing ok', {
  route_fixed: { ...route, pricingSource: 'route_fixed' },
  service_default: { ...fallback, pricingSource: 'service_default' }
})
