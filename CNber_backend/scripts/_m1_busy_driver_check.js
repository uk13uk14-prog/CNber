require('dotenv').config()
const mongoose = require('mongoose')
const Order = require('../models/Order')

;(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber')
  const uid = '69eb518cc86ce945794f1939'
  const active = ['assigned', 'accepted', 'driver_accepted', 'ready_to_start', 'started', 'in_progress']
  const orders = await Order.find({
    $or: [{ driverId: uid }, { assignedDriver: uid }],
    status: { $in: active }
  })
    .select('orderNo status driverId assignedDriver dispatchStatus depositStatus')
    .lean()
  console.log('orders holding driver 13900000001 in active statuses:', orders.length)
  orders.forEach((o) =>
    console.log(JSON.stringify({ orderNo: o.orderNo, status: o.status, dispatchStatus: o.dispatchStatus, depositStatus: o.depositStatus }))
  )

  // simulate frontend activeDriverIds + selectableDriversForOrder for CNB-20260622-001
  const allOrders = await Order.find({}).select('orderNo status driverId assignedDriver').lean()
  const busyIds = new Set()
  for (const o of allOrders) {
    if (!active.includes(o.status)) continue
    const id = o.driverId ? String(o.driverId) : o.assignedDriver ? String(o.assignedDriver) : ''
    if (id) busyIds.add(id)
  }
  console.log('activeDriverIds (frontend logic):', [...busyIds])
  console.log('driver 13900000001 busy?', busyIds.has(uid))

  await mongoose.disconnect()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
