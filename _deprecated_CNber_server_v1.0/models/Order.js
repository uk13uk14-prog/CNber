const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  from: String,
  to: String,
  pickupDate: String,
  pickupTime: String,
  vehicle: String,
  phone: String,
  wechat: String,
  remarks: String,
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Order', orderSchema)
s