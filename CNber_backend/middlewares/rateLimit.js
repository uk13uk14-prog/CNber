const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    code: 429,
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip
  },
  handler: (req, res, _next, options) => {
    const body =
      options.message && typeof options.message === 'object'
        ? options.message
        : { code: 429, message: String(options.message || 'Too many requests') }
    res.status(429).json(body)
  }
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    code: 429,
    message: 'Too many requests'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip
  },
  handler: (req, res, _next, options) => {
    const body =
      options.message && typeof options.message === 'object'
        ? options.message
        : { code: 429, message: String(options.message || 'Too many requests') }
    res.status(429).json(body)
  }
})

module.exports = {
  loginLimiter,
  apiLimiter
}
