const mongoose = require('mongoose')

const aiLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  question: String,
  response: String,
  intent: String,
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('AiLog', aiLogSchema)
