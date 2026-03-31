const mongoose = require('mongoose')

const helpTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subject: String,
  description: String,
  status: { type: String, default: 'pending' }, // pending / resolved
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('HelpTicket', helpTicketSchema)
