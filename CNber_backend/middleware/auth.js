const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: '未提供 token' })

  try {
    const decoded = jwt.verify(token, 'cnber-secret')
    req.adminId = decoded.id
    next()
  } catch (err) {
    return res.status(401).json({ message: 'token 无效或已过期' })
  }
}
