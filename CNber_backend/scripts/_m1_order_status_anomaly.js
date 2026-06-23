require('dotenv').config()
const mongoose = require('mongoose')
const Order = require('../models/Order')

const BAD_STATUSES = ['ready_to_start', 'accepted', 'started', 'completed']

;(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber')

  const anomalies = await Order.find({
    status: { $in: BAD_STATUSES },
    $or: [{ driverId: null }, { driverId: { $exists: false } }]
  })
    .sort({ updatedAt: -1 })
    .lean()

  console.log('===ANOMALY_COUNT===', anomalies.length)

  for (const o of anomalies) {
    const logs = (o.operationLogs || []).slice(-8)
    console.log('---ORDER---')
    console.log(JSON.stringify({
      _id: String(o._id),
      orderNo: o.orderNo || null,
      status: o.status,
      dispatchStatus: o.dispatchStatus || null,
      driverId: o.driverId ? String(o.driverId) : null,
      assignedDriver: o.assignedDriver ? String(o.assignedDriver) : null,
      assignedDriverPhone: o.assignedDriverPhone || '',
      depositStatus: o.depositStatus,
      paymentStatus: o.paymentStatus,
      paymentStage: o.paymentStage,
      depositPaid: o.depositPaid,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      lastOperationLogs: logs.map((l) => ({
        action: l.action,
        message: l.message,
        operatorPhone: l.operatorPhone,
        createdAt: l.createdAt
      }))
    }, null, 2))
  }

  // group by status
  const byStatus = {}
  for (const s of BAD_STATUSES) {
    byStatus[s] = anomalies.filter((o) => o.status === s).length
  }
  console.log('===BY_STATUS===', JSON.stringify(byStatus))

  // also check assignedDriver set but driverId null
  const assignedOnly = await Order.find({
    status: { $in: BAD_STATUSES },
    driverId: null,
    assignedDriver: { $ne: null }
  }).select('orderNo status assignedDriver assignedDriverPhone').lean()
  console.log('===ASSIGNED_BUT_NO_DRIVERID===', assignedOnly.length)
  assignedOnly.forEach((o) =>
    console.log(JSON.stringify({ orderNo: o.orderNo, status: o.status, assignedDriver: String(o.assignedDriver) }))
  )

  await mongoose.disconnect()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
