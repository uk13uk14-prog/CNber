const { attachPaymentToOrder } = require('./orderPaymentSync')
const {
  enrichOrderWithExchange,
  enrichOrderWithExchangeSync,
  enrichOrdersWithExchange,
  getGbpCnyRate
} = require('./exchangeRate')
const { attachSystemCurrency } = require('./orderMoneyCny')

function toPlainOrder(order) {
  if (!order) return order
  return typeof order.toObject === 'function' ? order.toObject() : order
}

/** 订单 API 响应：不改 amount 数值；附加 currency=CNY 与 CNY 展示字段 */
async function presentOrderForApi(order, { withPayment = true } = {}) {
  const plain = toPlainOrder(order)
  const base = withPayment ? attachPaymentToOrder(plain) : plain
  const enriched = await enrichOrderWithExchange(base)
  return attachSystemCurrency(enriched)
}

async function presentOrdersForApi(orders, { withPayment = false } = {}) {
  const list = (Array.isArray(orders) ? orders : []).map(toPlainOrder)
  const base = withPayment ? list.map(attachPaymentToOrder) : list
  const enriched = await enrichOrdersWithExchange(base)
  return enriched.map(attachSystemCurrency)
}

module.exports = {
  toPlainOrder,
  presentOrderForApi,
  presentOrdersForApi,
  enrichOrderWithExchangeSync,
  getGbpCnyRate
}
