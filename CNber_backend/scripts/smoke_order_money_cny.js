const assert = require('assert')
const {
  customerOrderAmountCny,
  driverSettlementAmountCny,
  attachSystemCurrency
} = require('../utils/orderMoneyCny')

const order = {
  amount: 90,
  customerPriceCny: 900,
  driverPriceGbp: 75,
  exchangeRate: 10,
  driverSettlementCny: 750,
  platformProfitCny: 150,
  depositAmount: 9,
  paidAmount: 900
}

assert.strictEqual(customerOrderAmountCny(order), 900)
assert.strictEqual(driverSettlementAmountCny(order), 750)
const presented = attachSystemCurrency(order)
assert.strictEqual(presented.currency, 'CNY')
assert.strictEqual(presented.orderAmountCny, 900)
assert.strictEqual(presented.displayCustomerPriceCny, 900)
assert.strictEqual(presented.displayDriverSettlementCny, 750)
assert.strictEqual(order.amount, 90)
assert.strictEqual(presented.amount, 90)

const legacy = {
  amount: 832.5,
  priceBreakdown: { totalPrice: 832.5, driverPayout: 624.38 }
}
assert.strictEqual(customerOrderAmountCny(legacy), null)
assert.strictEqual(driverSettlementAmountCny(legacy), null)
const presentedLegacy = attachSystemCurrency(legacy)
assert.strictEqual(presentedLegacy.displayCustomerPriceCny, null)
assert.strictEqual(presentedLegacy.displayDriverSettlementCny, null)
assert.strictEqual(presentedLegacy.amount, 832.5)
console.log('smoke_order_money_cny ok')
