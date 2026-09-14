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
const { STAFF_ROLES } = require('./utils/staffRoles')

const app = express()
app.set('trust proxy', 1)

const port = process.env.PORT || 3100
/** 真机/局域网联调默认 0.0.0.0；可用 HOST=127.0.0.1 收紧 */
const host = process.env.HOST || '0.0.0.0'
const mongoUrl =
  process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/cnber'
const adminDistPath = path.join(__dirname, 'public', 'admin')
const adminIndexPath = path.join(adminDistPath, 'index.html')

function createCorsMiddleware() {
  const isProduction = process.env.NODE_ENV === 'production'
  if (!isProduction) {
    return cors()
  }
  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    }
  })
}

app.use(createCorsMiddleware())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')))
app.use('/sounds', express.static(path.join(__dirname, 'public', 'sounds')))
app.use(
  '/downloads',
  express.static(path.join(__dirname, 'public', 'downloads'), {
    setHeaders(res, filePath) {
      if (String(filePath).toLowerCase().endsWith('.apk')) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${path.basename(filePath)}"`
        )
      }
    }
  })
)

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
const paymentConfigController = require('./controllers/paymentConfigController')
const paymentAppPayReservedController = require('./controllers/paymentAppPayReservedController')
const pricingConfigController = require('./controllers/pricingConfigController')
const systemConfigController = require('./controllers/systemConfigController')
const campaignController = require('./controllers/campaignController')
const marketingPublicController = require('./controllers/marketingPublicController')
const appVersionController = require('./controllers/appVersionController')
app.get('/api/payment/accounts', asyncHandler(paymentPublicController.listPublicAccounts))
app.get('/api/payment/config', asyncHandler(paymentConfigController.getPublicPaymentConfig))
/** 未来商户回调：公开入口仅返回 501，禁止假成功、不改订单 */
app.post('/api/payment/wechat/notify', asyncHandler(paymentAppPayReservedController.notifyWechatAppPay))
app.post('/api/payment/alipay/notify', asyncHandler(paymentAppPayReservedController.notifyAlipayAppPay))
app.get('/api/catalog/vehicle-classes', asyncHandler(pricingConfigController.listPublicVehicleClasses))
app.get('/api/catalog/service-types', asyncHandler(pricingConfigController.listPublicServiceTypes))
app.get('/api/public/system-config', asyncHandler(systemConfigController.getPublicSystemConfig))
app.get('/api/public/campaigns', asyncHandler(campaignController.listPublicCampaigns))
app.get('/api/public/coupons/validate', asyncHandler(marketingPublicController.validatePublicCoupon))
app.get('/api/app/version', asyncHandler(appVersionController.getAppVersion))
app.use('/api/admin', verifyToken, checkRole(...STAFF_ROLES), require('./routes/admin'))

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
app.use('/api/support-tickets', verifyToken, require('./routes/supportTickets'))
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

app.listen(port, host, () => {
  console.log(`✅ 后端服务已启动：http://${host}:${port} (local http://127.0.0.1:${port})`)
})
