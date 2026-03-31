const ActionLog = require('../models/ActionLog')
const Order = require('../models/Order')
const AiLog = require('../models/AiLog')

const getDateRange = (days) => {
  const dates = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

exports.getAnalytics = async (req, res) => {
  const labels = getDateRange(7)

  const pv = await Promise.all(labels.map(async date => {
    const count = await ActionLog.countDocuments({ date })
    return count
  }))

  const orders = await Promise.all(labels.map(async date => {
    const count = await Order.countDocuments({
      createdAt: { $gte: new Date(`${date}T00:00:00Z`), $lte: new Date(`${date}T23:59:59Z`) }
    })
    return count
  }))

  const ai = await Promise.all(labels.map(async date => {
    const count = await AiLog.countDocuments({
      createdAt: { $gte: new Date(`${date}T00:00:00Z`), $lte: new Date(`${date}T23:59:59Z`) }
    })
    return count
  }))

  res.json({ labels, pv, orders, ai })
}
