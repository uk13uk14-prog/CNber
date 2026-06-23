const Order = require('../models/Order')
const ORDER_STATUS = Order.ORDER_STATUS
const { paymentSummary, roundMoney } = require('../utils/pricing')
const { mapToMvpStatus } = require('../utils/orderPaymentSync')

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek() {
  const d = startOfToday()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

function startOfMonth() {
  const d = startOfToday()
  d.setDate(1)
  return d
}

function orderDisplayNo(order) {
  if (order.orderNo) return String(order.orderNo)
  if (order.orderDateKey && order.dailySeq != null) {
    return `${order.orderDateKey}-${String(order.dailySeq).padStart(3, '0')}`
  }
  const id = order._id ? String(order._id) : ''
  return id.length > 8 ? id.slice(-8) : id || '—'
}

function totalPriceOf(order) {
  const summary = paymentSummary(order)
  return summary.totalPrice
}

function driverPayoutOf(order) {
  const v = order.priceBreakdown?.driverPayout
  if (v != null && v !== '') return roundMoney(v)
  return roundMoney(totalPriceOf(order) * 0.75)
}

function platformProfitOf(order) {
  const v = order.priceBreakdown?.platformProfit
  if (v != null && v !== '') return roundMoney(v)
  return roundMoney(totalPriceOf(order) - driverPayoutOf(order))
}

function depositConfirmedAt(order) {
  return (
    order.payment?.depositConfirmedAt ||
    order.depositPaymentInfo?.confirmedAt ||
    null
  )
}

function balanceConfirmedAt(order) {
  return (
    order.payment?.balanceConfirmedAt ||
    order.balancePaymentInfo?.confirmedAt ||
    null
  )
}

function depositAmountOf(order) {
  const summary = paymentSummary(order)
  return roundMoney(
    order.payment?.depositAmount ?? order.depositAmount ?? summary.depositAmount
  )
}

function balanceAmountOf(order) {
  const summary = paymentSummary(order)
  return roundMoney(
    order.payment?.balanceAmount ?? order.balanceAmount ?? summary.balanceAmount
  )
}

function isDepositConfirmed(order) {
  const st = mapToMvpStatus(order.payment?.depositStatus || order.depositStatus)
  return st === 'confirmed' || Boolean(order.depositPaid)
}

function isBalanceConfirmed(order) {
  const st = mapToMvpStatus(order.payment?.balanceStatus || order.balanceStatus)
  return st === 'confirmed' || Boolean(order.remainingPaid)
}

function sumCollectedInRange(orders, rangeStart) {
  let total = 0
  const start = rangeStart.getTime()
  for (const o of orders) {
    const depAt = depositConfirmedAt(o)
    if (isDepositConfirmed(o) && depAt && new Date(depAt).getTime() >= start) {
      total += depositAmountOf(o)
    }
    const balAt = balanceConfirmedAt(o)
    if (isBalanceConfirmed(o) && balAt && new Date(balAt).getTime() >= start) {
      total += balanceAmountOf(o)
    }
  }
  return roundMoney(total)
}

function sumConfirmedDeposits(orders) {
  return roundMoney(
    orders.reduce((sum, o) => (isDepositConfirmed(o) ? sum + depositAmountOf(o) : sum), 0)
  )
}

function sumConfirmedBalances(orders) {
  return roundMoney(
    orders.reduce((sum, o) => (isBalanceConfirmed(o) ? sum + balanceAmountOf(o) : sum), 0)
  )
}

function sumPlatformProfit(orders) {
  return roundMoney(
    orders.reduce((sum, o) => {
      if (!isDepositConfirmed(o)) return sum
      return sum + platformProfitOf(o)
    }, 0)
  )
}

function sumUnsettledDriver(orders) {
  return roundMoney(
    orders.reduce((sum, o) => {
      if (o.driverSettlementStatus === 'paid') return sum
      const hasDriver = o.driverId || o.assignedDriver
      if (!hasDriver) return sum
      if (o.status !== ORDER_STATUS.COMPLETED) return sum
      const amt =
        o.driverSettlementAmount != null
          ? roundMoney(o.driverSettlementAmount)
          : driverPayoutOf(o)
      return sum + amt
    }, 0)
  )
}

async function loadFinanceOrders() {
  return Order.find({
    $or: [
      { depositStatus: { $in: ['submitted', 'pending', 'confirmed'] } },
      { balanceStatus: { $in: ['submitted', 'pending', 'confirmed'] } },
      { depositPaid: true },
      { remainingPaid: true },
      { 'payment.depositStatus': { $in: ['pending', 'confirmed'] } },
      { 'payment.balanceStatus': { $in: ['pending', 'confirmed'] } }
    ]
  })
    .select(
      'orderNo orderDateKey dailySeq userId driverId assignedDriver amount priceBreakdown quoteBreakdown depositAmount balanceAmount remainingAmount totalAmount depositStatus balanceStatus depositPaid remainingPaid payment depositPaymentInfo balancePaymentInfo driverSettlementStatus driverSettlementAmount status createdAt'
    )
    .populate('userId', 'phone')
    .populate('driverId', 'phone')
    .populate('assignedDriver', 'phone')
    .lean()
}

function phoneOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref.phone) return ref.phone
  return ''
}

function buildTransactionRows(orders) {
  const rows = []
  for (const o of orders) {
    const customerPhone = phoneOf(o.userId)
    const depStatus = mapToMvpStatus(o.payment?.depositStatus || o.depositStatus)
    const balStatus = mapToMvpStatus(o.payment?.balanceStatus || o.balanceStatus)

    if (depStatus !== 'unpaid' || isDepositConfirmed(o)) {
      rows.push({
        _id: `${o._id}-deposit`,
        orderId: o._id,
        orderNo: orderDisplayNo(o),
        customerPhone,
        type: 'deposit',
        amount: depositAmountOf(o),
        status: depStatus,
        confirmedAt: depositConfirmedAt(o)
      })
    }
    if (balStatus !== 'unpaid' || isBalanceConfirmed(o)) {
      rows.push({
        _id: `${o._id}-balance`,
        orderId: o._id,
        orderNo: orderDisplayNo(o),
        customerPhone,
        type: 'balance',
        amount: balanceAmountOf(o),
        status: balStatus,
        confirmedAt: balanceConfirmedAt(o)
      })
    }
  }
  rows.sort((a, b) => {
    const ta = a.confirmedAt ? new Date(a.confirmedAt).getTime() : 0
    const tb = b.confirmedAt ? new Date(b.confirmedAt).getTime() : 0
    return tb - ta
  })
  return rows
}

exports.getFinanceSummary = async (req, res) => {
  const orders = await loadFinanceOrders()
  const t0 = startOfToday()
  const w0 = startOfWeek()
  const m0 = startOfMonth()

  res.json({
    code: 0,
    message: 'success',
    data: {
      todayCollected: sumCollectedInRange(orders, t0),
      weekCollected: sumCollectedInRange(orders, w0),
      monthCollected: sumCollectedInRange(orders, m0),
      confirmedDepositTotal: sumConfirmedDeposits(orders),
      confirmedBalanceTotal: sumConfirmedBalances(orders),
      platformProfit: sumPlatformProfit(orders),
      unsettledDriverAmount: sumUnsettledDriver(orders)
    }
  })
}

exports.listFinanceTransactions = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)))
  const type = String(req.query.type || '').trim()
  const status = String(req.query.status || '').trim()

  let rows = buildTransactionRows(await loadFinanceOrders())
  if (type === 'deposit' || type === 'balance') {
    rows = rows.filter((r) => r.type === type)
  }
  if (status) {
    rows = rows.filter((r) => r.status === status)
  }

  const total = rows.length
  const transactions = rows.slice((page - 1) * pageSize, page * pageSize)

  res.json({
    code: 0,
    message: 'success',
    data: { transactions, total, page, pageSize }
  })
}

exports.listDriverSettlements = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)))
  const settlementStatus = String(req.query.status || '').trim()

  const query = {
    $or: [{ driverId: { $ne: null } }, { assignedDriver: { $ne: null } }],
    status: {
      $in: [
        ORDER_STATUS.COMPLETED,
        ORDER_STATUS.IN_PROGRESS,
        ORDER_STATUS.ARRIVED,
        ORDER_STATUS.READY_TO_START,
        ORDER_STATUS.DRIVER_ACCEPTED,
        ORDER_STATUS.ASSIGNED
      ]
    }
  }
  if (settlementStatus) {
    query.driverSettlementStatus = settlementStatus
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('driverId', 'phone')
      .populate('assignedDriver', 'phone')
      .lean(),
    Order.countDocuments(query)
  ])

  const settlements = orders.map((o) => {
    const driverRef = o.assignedDriver || o.driverId
    const orderAmount = totalPriceOf(o)
    const driverDue = driverPayoutOf(o)
    const profit = platformProfitOf(o)
    return {
      _id: o._id,
      orderId: o._id,
      orderNo: orderDisplayNo(o),
      driverPhone: phoneOf(driverRef),
      orderAmount,
      driverDue,
      platformProfit: profit,
      settlementStatus: o.driverSettlementStatus || 'not_required',
      settlementAmount: o.driverSettlementAmount,
      settledAt: o.driverSettlementConfirmedAt || null,
      orderStatus: o.status
    }
  })

  res.json({
    code: 0,
    message: 'success',
    data: { settlements, total, page, pageSize }
  })
}
