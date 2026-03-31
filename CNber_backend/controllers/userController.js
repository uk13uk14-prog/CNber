const User = require('../models/User')

exports.getUserList = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1)
    const pageSize = Number(req.query.pageSize || 10)
    const search = req.query.search || ''
    const query = search
      ? {
          phone: new RegExp(search, 'i')
        }
      : {}

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)

    const total = await User.countDocuments(query)
    res.json({ users, total, page, pageSize })
  } catch (error) {
    next(error)
  }
}

exports.banUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'banned' },
      { new: true }
    )
    res.json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

exports.unbanUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    )
    res.json({ success: true, user })
  } catch (error) {
    next(error)
  }
}
