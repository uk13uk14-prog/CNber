const mongoose = require('mongoose')

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'ongoing', 'completed'],
    default: 'pending'
  },
  pickup: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Order', OrderSchema)