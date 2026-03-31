const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
require('./db') // 连接数据库
const orderRoutes = require('./routes/order')

const app = express()
const PORT = 3101

app.use(cors())
app.use(bodyParser.json())

app.use('/api', orderRoutes)

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`)
})
