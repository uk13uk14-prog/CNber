#!/usr/bin/env node
/**
 * 为 smoke_assign_driver_visible_to_driver 准备一条可派单订单（仅测试环境）
 * - 定金已确认
 * - 无司机
 * - status=deposit_paid（可再次 assign）
 *
 * 用法（M1 上）:
 *   node scripts/_prepare_smoke_assign_order.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const Order = require('../models/Order')
const ORDER_STATUS = Order.ORDER_STATUS
const DISPATCH_STATUS = Order.DISPATCH_STATUS

const PREFERRED_ORDER_NO = process.env.SMOKE_PREP_ORDER_NO || 'CNB-20260621-005'

async function main() {
  const mongoUrl =
    process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'
  await mongoose.connect(mongoUrl)

  let order =
    (await Order.findOne({ orderNo: PREFERRED_ORDER_NO })) ||
    (await Order.findOne({
      depositStatus: 'confirmed',
      status: { $nin: ['cancelled', 'completed'] }
    }).sort({ updatedAt: -1 }))

  if (!order) {
    console.log('SKIP: 无可准备订单')
    process.exit(0)
  }

  order.driverId = null
  order.assignedDriver = null
  order.assignedDriverName = ''
  order.assignedDriverPhone = ''
  order.assignedAt = null
  order.dispatchStatus = DISPATCH_STATUS.PENDING
  order.status = ORDER_STATUS.DEPOSIT_PAID
  order.updatedAt = new Date()
  await order.save()

  console.log(
    JSON.stringify({
      prepared: true,
      orderId: String(order._id),
      orderNo: order.orderNo,
      status: order.status,
      depositStatus: order.depositStatus,
      dispatchStatus: order.dispatchStatus
    })
  )
  await mongoose.disconnect()
}

main().catch(async (e) => {
  console.error(e)
  try {
    await mongoose.disconnect()
  } catch (_) {
    /* ignore */
  }
  process.exit(1)
})
