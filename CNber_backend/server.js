require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const morgan = require('morgan')
const logger = require('./utils/logger')
const { apiLimiter } = require('./middlewares/rateLimit')

const app = express()
app.set('trust proxy', 1)

const port = process.env.PORT || 3100
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'

app.use(cors())
app.use(express.json())

morgan.token('client-ip', (req) => req.ip || '-')

app.use(
  morgan(
    ':client-ip :method :url HTTP/:http-version :status :res[content-length] - :response-time ms',
    {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    }
  )
)

app.use('/api', apiLimiter)

mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log(`✅ MongoDB 已连接: ${mongoUrl}`)
  })
  .catch((error) => {
    console.error('❌ MongoDB 连接失败:', error.message)
    process.exit(1)
  })

app.get('/api/status', (req, res) => {
  res.json({
    code: 0,
    message: 'success',
    data: {
      ok: true,
      message: 'CNber backend is running'
    }
  })
})

const { verifyToken, checkRole } = require('./middlewares/authMiddleware')

app.use('/api/auth', require('./routes/auth'))
app.use('/api/address', require('./routes/address'))
app.use('/api/order', verifyToken, require('./routes/order'))
app.use('/api/user', verifyToken, checkRole('admin'), require('./routes/user'))
app.use('/api/driver', verifyToken, checkRole('driver'), require('./routes/driver'))
app.use(
  '/api/admin',
  verifyToken,
  checkRole('admin'),
  require('./routes/admin')
)

app.use((req, res, next) => {
  const err = new Error('接口不存在')
  err.code = 404
  next(err)
})

const errorHandler = require('./middlewares/errorHandler')
app.use(errorHandler)

app.listen(port, () => {
  console.log(`✅ 后端服务已启动：http://localhost:${port}`)
})
