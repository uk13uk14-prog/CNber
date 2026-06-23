#!/usr/bin/env node
/**
 * 从历史订单回填客户/司机画像
 * 用法: node scripts/backfill_profiles_from_orders.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const Order = require('../models/Order')
const {
  syncCustomerProfileFromOrder,
  syncDriverProfileFromOrder
} = require('../utils/profileSync')

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    'mongodb://127.0.0.1:27017/cnber'
  if (!uri) {
    console.error('缺少 MONGODB_URI / MONGO_URI / MONGO_URL')
    process.exit(1)
  }
  await mongoose.connect(uri)
  console.log('connected')

  const customerIds = await Order.distinct('userId', { isDeleted: { $ne: true } })
  const driverIds = await Order.distinct('driverId', {
    driverId: { $ne: null },
    isDeleted: { $ne: true }
  })
  const assignedIds = await Order.distinct('assignedDriver', {
    assignedDriver: { $ne: null },
    isDeleted: { $ne: true }
  })
  const allDriverUserIds = [...new Set([...driverIds, ...assignedIds].map(String))]

  let customerOk = 0
  let customerErr = 0
  for (const userId of customerIds) {
    try {
      await syncCustomerProfileFromOrder({ userId })
      customerOk += 1
    } catch (err) {
      customerErr += 1
      console.error(`customer ${userId}: ${err.message}`)
    }
  }

  let driverOk = 0
  let driverErr = 0
  for (const driverUserId of allDriverUserIds) {
    try {
      await syncDriverProfileFromOrder({ driverId: driverUserId })
      driverOk += 1
    } catch (err) {
      driverErr += 1
      console.error(`driver ${driverUserId}: ${err.message}`)
    }
  }

  console.log(
    JSON.stringify(
      {
        customers: { total: customerIds.length, ok: customerOk, err: customerErr },
        drivers: { total: allDriverUserIds.length, ok: driverOk, err: driverErr }
      },
      null,
      2
    )
  )
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
