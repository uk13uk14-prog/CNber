require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const app = express()
const port = process.env.PORT || 3100
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'

app.use(cors())
app.use(express.json())

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
    ok: true,
    message: 'CNber backend is running'
  })
})

app.use('/api/auth', require('./routes/auth'))
app.use('/api/order', require('./routes/order'))
app.use('/api/user', require('./routes/user'))
app.use('/api/driver', require('./routes/driver'))

app.use((req, res) => {
  res.status(404).json({
    message: '接口不存在'
  })
})

app.use((err, req, res, next) => {
  console.error('❌ 服务异常:', err)
  res.status(500).json({
    message: err.message || '服务器内部错误'
  })
})

app.listen(port, () => {
  console.log(`✅ 后端服务已启动：http://localhost:${port}`)
})