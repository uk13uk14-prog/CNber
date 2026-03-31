const express = require('express')
const router = express.Router()
const Order = require('../models/Order')

// 下单接口
router.post('/submitOrder', async (req, res) => {
  try {
    const newOrder = new Order(req.body)
    await newOrder.save()
    res.json({ success: true, message: '订单提交成功' })
  } catch (err) {
    res.status(500).json({ success: false, message: '提交失败', error: err })
  }
})

// 查看订单接口（测试用）
router.get('/getOrders', async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 })
  res.json({ orders })
})

module.exports = router
