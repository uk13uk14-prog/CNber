require('dotenv').config()

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required')
}

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const morgan = require('morgan')
const path = require('path')
const logger = require('./utils/logger')
const { apiLimiter } = require('./middlewares/rateLimit')
const { verifyToken, checkRole } = require('./middlewares/authMiddleware')

const app = express()
app.set('trust proxy', 1)

const port = process.env.PORT || 3100
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'
const adminDistPath = path.join(__dirname, 'public', 'admin')
const adminIndexPath = path.join(adminDistPath, 'index.html')

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
const asyncHandler = require('./utils/asyncHandler')
const paymentPublicController = require('./controllers/paymentPublicController')
app.get('/api/payment/accounts', asyncHandler(paymentPublicController.listPublicAccounts))
app.use('/api/admin', verifyToken, checkRole('admin'), require('./routes/admin'))

mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log('✅ MongoDB 已连接')
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

app.use('/api/auth', require('./routes/auth'))
app.use('/api/address', require('./routes/address'))
app.use('/api/order', verifyToken, require('./routes/order'))
app.use('/api/payment', verifyToken, require('./routes/payment'))
// GET /api/payment/accounts 已在上方公开注册
app.use('/api/user', verifyToken, checkRole('admin'), require('./routes/user'))
app.use('/api/driver', verifyToken, checkRole('driver'), require('./routes/driver'))

// /admin 后台 SPA（须在全部 /api 之后注册，不抢占 API）
// 1) 先静态：/admin/assets/*.js 等由磁盘真实文件响应
app.use('/admin', express.static(adminDistPath))

// 2) 再 fallback：仅无扩展名的前端路由回 index.html
app.get('/admin', (req, res) => {
  res.sendFile(adminIndexPath)
})
app.get('/admin/*', (req, res, next) => {
  if (path.extname(req.path)) {
    return next()
  }
  res.sendFile(adminIndexPath)
})

// 404
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  })
})

const errorHandler = require('./middlewares/errorHandler')
app.use(errorHandler)

app.listen(port, () => {
  console.log(`✅ 后端服务已启动：http://localhost:${port}`)
})
