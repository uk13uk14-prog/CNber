const HelpTicket = require('../models/HelpTicket')
const User = require('../models/User')

exports.getTickets = async (req, res) => {
  const { page = 1, status = '' } = req.query
  const pageSize = 10
  const query = status ? { status } : {}
  const tickets = await HelpTicket.find(query)
    .populate('userId', 'phone')
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)

  const formatted = tickets.map(t => ({
    _id: t._id,
    userPhone: t.userId?.phone || '未知',
    subject: t.subject,
    description: t.description,
    status: t.status,
    createdAt: t.createdAt
  }))

  const total = await HelpTicket.countDocuments(query)
  res.json({ tickets: formatted, total })
}

exports.markResolved = async (req, res) => {
  await HelpTicket.findByIdAndUpdate(req.params.id, { status: 'resolved' })
  res.json({ success: true })
}
