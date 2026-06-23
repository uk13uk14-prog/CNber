require('dotenv').config()
const mongoose = require('mongoose')
const Order = require('../models/Order')
const { canDispatchByDeposit } = require('../utils/orderPaymentFlow')

;(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber')
  const o = await Order.findOne({ orderNo: 'CNB-20260622-001' }).lean()
  if (!o) {
    console.log('NOT_FOUND')
    process.exit(1)
  }
  console.log(JSON.stringify({
    orderNo: o.orderNo,
    _id: String(o._id),
    status: o.status,
    dispatchStatus: o.dispatchStatus,
    depositStatus: o.depositStatus,
    paymentStage: o.paymentStage,
    paymentStatus: o.paymentStatus,
    depositPaid: o.depositPaid,
    remainingPaid: o.remainingPaid,
    paidAmount: o.paidAmount,
    depositAmount: o.depositAmount,
    depositPaymentInfo: o.depositPaymentInfo,
    payment: o.payment,
    canDispatchByDeposit: canDispatchByDeposit(o)
  }, null, 2))
  await mongoose.disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
