const Driver = require('../models/Driver')

exports.getDriverList = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1)
    const pageSize = Number(req.query.pageSize || 10)
    const status = req.query.status || ''
    const query = status ? { status } : {}

    const drivers = await Driver.find(query)
      .populate('userId', 'phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)

    const total = await Driver.countDocuments(query)
    res.json({ drivers, total, page, pageSize })
  } catch (error) {
    next(error)
  }
}

exports.approveDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    )
    res.json({ success: true, driver })
  } catch (error) {
    next(error)
  }
}

exports.rejectDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    )
    res.json({ success: true, driver })
  } catch (error) {
    next(error)
  }
}

exports.banDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { status: 'banned' },
      { new: true }
    )
    res.json({ success: true, driver })
  } catch (error) {
    next(error)
  }
}
