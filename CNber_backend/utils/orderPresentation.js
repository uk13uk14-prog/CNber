const { attachPaymentToOrder } = require('./orderPaymentSync')
const {
  enrichOrderWithExchange,
  enrichOrderWithExchangeSync,
  enrichOrdersWithExchange,
  getGbpCnyRate
} = require('./exchangeRate')

function toPlainOrder(order) {
  if (!order) return order
  return typeof order.toObject === 'function' ? order.toObject() : order
}

/** 订单 API 响应：保留 GBP 字段，附加 payment + CNY 展示字段 */
async function presentOrderForApi(order, { withPayment = true } = {}) {
  const plain = toPlainOrder(order)
  const base = withPayment ? attachPaymentToOrder(plain) : plain
  return enrichOrderWithExchange(base)
}

async function presentOrdersForApi(orders, { withPayment = false } = {}) {
  const list = (Array.isArray(orders) ? orders : []).map(toPlainOrder)
  const base = withPayment ? list.map(attachPaymentToOrder) : list
  return enrichOrdersWithExchange(base)
}

module.exports = {
  toPlainOrder,
  presentOrderForApi,
  presentOrdersForApi,
  enrichOrderWithExchangeSync,
  getGbpCnyRate
}
