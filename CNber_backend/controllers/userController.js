const User = require('../models/User')

exports.getUserList = async (req, res) => {
  const page = Number(req.query.page || 1)
  const pageSize = Number(req.query.pageSize || 10)
  const search = req.query.search || ''
  const query = {}
  if (search) {
    query.phone = new RegExp(search, 'i')
  }
  if (req.query.role && typeof req.query.role === 'string') {
    query.role = req.query.role
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)

  const total = await User.countDocuments(query)
  res.json({
    code: 0,
    message: 'success',
    data: { users, total, page, pageSize }
  })
}

exports.banUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: 'banned' },
    { new: true }
  ).select('-password')
  res.json({
    code: 0,
    message: 'success',
    data: { user }
  })
}

exports.unbanUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: 'active' },
    { new: true }
  ).select('-password')
  res.json({
    code: 0,
    message: 'success',
    data: { user }
  })
}
