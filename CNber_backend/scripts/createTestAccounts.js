/**
 * 创建或更新固定测试账号（乘客/司机/管理）
 *
 * 用法：
 *   node scripts/createTestAccounts.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'

const TEST_ACCOUNTS = [
  {
    phone: '13900000002',
    password: 'Client123456',
    role: 'user',
    status: 'active'
  },
  {
    phone: '13900000001',
    password: 'Driver123456',
    role: 'driver',
    status: 'active'
  },
  {
    phone: '13800000000',
    password: 'Admin123456',
    role: 'admin',
    status: 'active'
  }
]

async function upsertAccount(account) {
  const hashedPassword = await bcrypt.hash(account.password, 10)
  const user = await User.findOneAndUpdate(
    { phone: account.phone },
    {
      $set: {
        phone: account.phone,
        password: hashedPassword,
        role: account.role,
        status: account.status
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  return {
    phone: user.phone,
    role: user.role,
    status: user.status
  }
}

async function main() {
  await mongoose.connect(mongoUrl)
  console.log(`✅ MongoDB 已连接: ${mongoUrl}`)

  const results = []
  for (const account of TEST_ACCOUNTS) {
    const result = await upsertAccount(account)
    results.push(result)
  }

  console.log('✅ 测试账号已创建或更新：')
  results.forEach((item, index) => {
    console.log(
      `${index + 1}. phone=${item.phone}, role=${item.role}, status=${item.status}`
    )
  })
}

main()
  .catch((error) => {
    console.error('❌ 创建测试账号失败:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
    console.log('✅ MongoDB 连接已关闭')
  })
