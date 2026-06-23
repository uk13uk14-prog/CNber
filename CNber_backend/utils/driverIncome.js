const { roundMoney } = require('./pricing')

/**
 * 司机单笔收入 GBP（不用客户价 amount）
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
  driverIncomeGbpAggregationExpr,
  buildDriverOrderMatch
}
