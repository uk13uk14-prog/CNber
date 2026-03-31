const mongoose = require('mongoose')

const DriverSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  licenseNumber: String,
  carPlate: String,
  score: { type: Number, default: 5 },
  totalOrders: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'banned'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Driver', DriverSchema)
