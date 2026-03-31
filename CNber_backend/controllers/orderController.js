const Order = require('../models/Order')

exports.createOrder = async (req, res, next) => {
  try {
    const { userId, pickup, destination, status } = req.body

    if (!userId || !pickup || !destination) {
      return res.status(400).json({ message: '字段缺失' })
    }

    const order = await Order.create({
      userId,
      pickup,
      destination,
      status
    })

    res.status(201).json({ message: '下单成功', order })
  } catch (error) {
    next(error)
  }
}

exports.listOrders = async (req, res, next) => {
  try {
    const query = req.orderQuery || {}

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'phone')

    res.json({ orders })
  } catch (error) {
    next(error)
  }
}