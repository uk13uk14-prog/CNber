const { roundMoney } = require('./pricing')
const { driverSettlementAmountCny } = require('./orderMoneyCny')

/**
 * 司机单笔收入 GBP（内部兼容字段，不用客户价 amount）
 * 优先：driverPriceGbp → driverSettlementGbp → driverAmount → 兼容旧字段
 */
function resolveDriverIncomeGbp(order = {}) {
  const candidates = [
    order.driverPriceGbp,
    order.driverSettlementGbp,
    order.driverAmount,
    order.driverSettlementAmount,
    order.priceBreakdown?.driverPayout,
    order.quoteBreakdown?.driverPriceGbp
  ]
  for (const raw of candidates) {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return roundMoney(n)
  }
  return 0
}

/** MongoDB aggregation：解析单笔司机收入 GBP */
function driverIncomeGbpAggregationExpr() {
  return {
    $switch: {
      branches: [
        {
          case: { $gt: [{ $ifNull: ['$driverPriceGbp', 0] }, 0] },
          then: '$driverPriceGbp'
        },
        {
          case: { $gt: [{ $ifNull: ['$driverSettlementGbp', 0] }, 0] },
          then: '$driverSettlementGbp'
        },
        {
          case: { $gt: [{ $ifNull: ['$driverAmount', 0] }, 0] },
          then: '$driverAmount'
        },
        {
          case: { $gt: [{ $ifNull: ['$driverSettlementAmount', 0] }, 0] },
          then: '$driverSettlementAmount'
        },
        {
          case: { $gt: [{ $ifNull: ['$priceBreakdown.driverPayout', 0] }, 0] },
          then: '$priceBreakdown.driverPayout'
        },
        {
          case: { $gt: [{ $ifNull: ['$quoteBreakdown.driverPriceGbp', 0] }, 0] },
          then: '$quoteBreakdown.driverPriceGbp'
        }
      ],
      default: 0
    }
  }
}

/** 司机单笔收入 CNY：只用已存 driverSettlementCny，禁止 GBP×汇率 */
function resolveDriverIncomeCny(order = {}) {
  return driverSettlementAmountCny(order)
}

function driverIncomeCnyAggregationExpr() {
  return {
    $cond: [
      { $gt: [{ $ifNull: ['$driverSettlementCny', 0] }, 0] },
      '$driverSettlementCny',
      0
    ]
  }
}

/** 从订单列表汇总已确认 CNY 结算；缺字段的不计收入 */
function sumStoredDriverSettlementCny(orders = []) {
  let sum = 0
  let confirmed = 0
  let missing = 0
  for (const o of orders) {
    const n = driverSettlementAmountCny(o)
    if (n != null && n > 0) {
      sum += n
      confirmed += 1
    } else {
      missing += 1
    }
  }
  return {
    cny: confirmed > 0 ? roundMoney(sum) : null,
    confirmed,
    missing
  }
}

const ORDER_STATUS = require('../models/Order').ORDER_STATUS

function buildDriverOrderMatch(driverId, since = null) {
  const match = {
    $or: [{ driverId }, { assignedDriver: driverId }],
    status: ORDER_STATUS.COMPLETED
  }
  if (since) {
    match.updatedAt = { $gte: since }
  }
  return match
}

module.exports = {
  resolveDriverIncomeGbp,
  resolveDriverIncomeCny,
  driverIncomeGbpAggregationExpr,
  driverIncomeCnyAggregationExpr,
  sumStoredDriverSettlementCny,
  buildDriverOrderMatch
}
