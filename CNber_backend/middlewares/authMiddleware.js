const jwt = require('jsonwebtoken')
const User = require('../models/User')

const JWT_SECRET = process.env.JWT_SECRET

function touchLastSeen(userId) {
  if (!userId) return
  User.updateOne({ _id: userId }, { $set: { lastSeen: new Date() } }).catch(() => {})
}

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || ''
    let token = ''
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim()
    } else if (authHeader) {
      token = authHeader.trim()
    }

    if (!token) {
      const e = new Error('无效登录')
      e.code = 401
      return next(e)
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    touchLastSeen(decoded.userId)
    next()
  } catch (error) {
    const e = new Error('无效登录')
    e.code = 401
    next(e)
  }
}

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      const e = new Error('无效登录')
      e.code = 401
      return next(e)
    }
    if (!roles.includes(req.user.role)) {
      const e = new Error('Forbidden')
      e.code = 403
      return next(e)
    }
    next()
  }
}

module.exports = {
  verifyToken,
  checkRole
}
