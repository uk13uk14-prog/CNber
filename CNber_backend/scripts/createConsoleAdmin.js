/**
 * 创建可登录控制台的 admin 账号（写入 User 表，与 POST /api/auth/login 一致）
 *
 * 用法：
 *   node scripts/createConsoleAdmin.js 13800000000 Admin123456
 *
 * 依赖：Mongo 已启动，与 server 相同 MONGO_URL
 */
require('dotenv').config()
const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const User = require('../models/User')

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'
const phone = process.argv[2] || '13800000000'
const plain = process.argv[3] || 'Admin123456'

async function main() {
  await mongoose.connect(mongoUrl)
  const hashedPassword = await bcrypt.hash(plain, 10)
  const user = await User.findOneAndUpdate(
    { phone },
    {
      $set: {
        phone,
        password: hashedPassword,
        role: 'admin'
      }
    },
    { upsert: true, new: true }
  )
  console.log('✅ 已就绪 admin 账号:', user.phone, 'role=', user.role)
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
