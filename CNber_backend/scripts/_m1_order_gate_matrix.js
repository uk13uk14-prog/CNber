require('dotenv').config()
const mongoose = require('mongoose')
const Order = require('../models/Order')
const { canDispatchByDeposit } = require('../utils/orderPaymentFlow')

;(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber')
  const dispatchableStatus = ['deposit_paid', 'pending', 'assigned']
  const orders = await Order.find({ driverId: null, assignedDriver: null })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean()

  console.log('--- unassigned orders: frontend vs backend gate ---')
  for (const o of orders) {
    const feHasDeposit =
      o.depositStatus === 'confirmed' || Boolean(o.depositPaid || o.paymentStatus === 'paid')
    const feDispatchable = dispatchableStatus.includes(o.status)
    const beDeposit = canDispatchByDeposit(o)
    const beStatus = ['pending', 'assigned', 'deposit_paid'].includes(o.status)
    console.log(
      JSON.stringify({
        orderNo: o.orderNo,
        status: o.status,
        depositStatus: o.depositStatus,
        depositPaid: o.depositPaid,
        paymentStatus: o.paymentStatus,
        paymentStage: o.paymentStage,
        feHasDeposit,
        feDispatchable,
        feCanAssignUI: feHasDeposit && feDispatchable,
        beDeposit,
        beStatus,
        beCanAssign: beDeposit && beStatus
      })
    )
  }
  await mongoose.disconnect()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
