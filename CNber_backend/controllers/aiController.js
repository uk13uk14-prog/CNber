const AiLog = require('../models/AiLog')
const User = require('../models/User')

exports.getLogs = async (req, res) => {
  const { keyword = '' } = req.query
  const query = keyword
    ? { question: { $regex: keyword, $options: 'i' } }
    : {}

  const logs = await AiLog.find(query)
    .populate('userId', 'phone')
    .sort({ createdAt: -1 })
    .limit(100)

  const formatted = logs.map(log => ({
    _id: log._id,
    userPhone: log.userId?.phone || '未知',
    question: log.question,
    response: log.response,
    intent: log.intent,
    createdAt: log.createdAt
  }))

  res.json({ logs: formatted })
}
