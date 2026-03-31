const mongoose = require('mongoose')

const actionLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String, // 行为类型，如 login、order_create、payment_success
  page: String,   // 发生行为的页面路径
  device: String, // 来源平台，如 admin_web、小程序
  detail: Object, // 附加信息（可选字段）
  date: String,   // 例如 2025-05-19，用于按日统计
  timestamp: { type: Date, default: Date.now }
})

module.exports = mongoose.model('ActionLog', actionLogSchema)
