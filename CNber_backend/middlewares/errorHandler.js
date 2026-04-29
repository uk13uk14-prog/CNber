const logger = require('../utils/logger')

module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  const isProd = process.env.NODE_ENV === 'production'

  let code =
    typeof err.code === 'number' && err.code !== 11000 ? err.code : undefined

  if (err.code === 11000 || err.code === '11000') {
    code = 409
  }

  if (code === undefined) {
    if (err.name === 'ValidationError') {
      code = 400
    } else if (err.name === 'CastError') {
      code = 400
    } else {
      code = 500
    }
  }

  let message = 'Internal Server Error'
  if (err.message && String(err.message).trim()) {
    message = err.message
  }

  if (err.code === 11000 || err.code === '11000') {
    message = 'Resource already exists'
  }

  if (isProd && code === 500) {
    message = 'Internal Server Error'
  }

  const httpStatus = code >= 400 && code < 600 ? code : 500

  logger.log({
    level: 'error',
    message: err.message || message,
    code: typeof err.code === 'number' ? err.code : code,
    stack: err.stack,
    ip: req.ip
  })

  const body = { code, message, data: null }
  res.status(httpStatus).json(body)
}
