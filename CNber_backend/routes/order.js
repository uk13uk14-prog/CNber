const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const Order = require('../models/Order')
const orderController = require('../controllers/orderController')

const parseAuthToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader

    if (!token) {
      return res.status(401).json({ message: '未提供 token' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cnber-secret')
    req.auth = decoded

    next()
  } catch (error) {
    return res.status(401).json({ message: 'token 无效或已过期' })
  }
}

router.post('/create', parseAuthToken, (req, res, next) => {
  req.body.userId = req.auth.userId
  req.body.status = req.body.status || 'pending'
  next()
}, orderController.createOrder)

router.get('/list', parseAuthToken, (req, res, next) => {
  if (req.auth.role === 'user') {
    req.orderQuery = { userId: req.auth.userId }
    return next()
  }

  if (req.auth.role === 'driver') {
    req.orderQuery = {
      $or: [
        { status: 'pending' },
        { driverId: req.auth.userId, status: 'accepted' },
        { driverId: req.auth.userId, status: 'ongoing' }
      ]
    }
    return next()
  }

  return res.status(403).json({ message: '无权限查看订单' })
}, orderController.listOrders)

router.post('/accept', parseAuthToken, async (req, res, next) => {
  try {
    if (req.auth.role !== 'driver') {
      return res.status(403).json({ message: '只有司机可以接单' })
    }

    const { orderId } = req.body
    if (!orderId) {
      return res.status(400).json({ message: '缺少 orderId' })
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: 'pending' },
      { driverId: req.auth.userId, status: 'accepted' },
      { new: true }
    )

    if (!order) {
      return res.status(404).json({ message: '订单不存在或不可接单' })
    }

    res.json({ message: '接单成功', order })
  } catch (error) {
    next(error)
  }
})

router.post('/start', parseAuthToken, async (req, res, next) => {
  try {
    if (req.auth.role !== 'driver') {
      return res.status(403).json({ message: '只有司机可以开始行程' })
    }

    const { orderId } = req.body
    if (!orderId) {
      return res.status(400).json({ message: '缺少 orderId' })
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, driverId: req.auth.userId, status: 'accepted' },
      { status: 'ongoing' },
      { new: true }
    )

    if (!order) {
      return res.status(404).json({ message: '订单不存在或无权限开始行程' })
    }

    res.json({ message: '行程已开始', order })
  } catch (error) {
    next(error)
  }
})

router.post('/complete', parseAuthToken, async (req, res, next) => {
  try {
    if (req.auth.role !== 'driver') {
      return res.status(403).json({ message: '只有司机可以完成行程' })
    }

    const { orderId } = req.body
    if (!orderId) {
      return res.status(400).json({ message: '缺少 orderId' })
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, driverId: req.auth.userId, status: 'ongoing' },
      { status: 'completed' },
      { new: true }
    )

    if (!order) {
      return res.status(404).json({ message: '订单不存在或无权限完成行程' })
    }

    res.json({ message: '行程已完成', order })
  } catch (error) {
    next(error)
  }
})

module.exports = router