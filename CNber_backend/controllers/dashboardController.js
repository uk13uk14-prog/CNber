const Order = require('../models/Order')
const HelpTicket = require('../models/HelpTicket')
const AiLog = require('../models/AiLog')
const User = require('../models/User')
const Driver = require('../models/Driver')

exports.getMobileStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10)

    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: new Date(`${today}T00:00:00Z`) }
    })

    const pendingTickets = await HelpTicket.countDocuments({ status: 'pending' })
    const pendingOrders = await Order.countDocuments({ status: 'pending' })
    const aiErrors = await AiLog.countDocuments({ intent: 'error' })
    const totalUsers = await User.countDocuments()
    const totalDrivers = await Driver.countDocuments()

    res.json({
      todayOrders,
      pendingTickets,
      pendingOrders,
      aiErrors,
      totalUsers,
      totalDrivers
    })
  } catch (error) {
    next(error)
  }
}
