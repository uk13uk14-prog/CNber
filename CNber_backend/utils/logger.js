const fs = require('fs')
const path = require('path')
const winston = require('winston')

const logsDir = path.join(__dirname, '..', 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const lineFormat = winston.format.printf((info) => {
  const { timestamp, level, message, code, stack, ip } = info
  const parts = [`${timestamp} [${level}] ${message}`]
  if (ip !== undefined && ip !== null && ip !== '') {
    parts.push(`ip=${ip}`)
  }
  if (code !== undefined && code !== null) {
    parts.push(`code=${code}`)
  }
  if (stack) {
    parts.push(`stack=${stack}`)
  }
  return parts.join(' | ')
})

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    lineFormat
  ),
  transports: [
    new winston.transports.Console({ level: 'info' }),
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      level: 'info'
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    })
  ]
})

module.exports = logger
