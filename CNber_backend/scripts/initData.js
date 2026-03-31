const mongoose = require('mongoose')
const User = require('../models/User')
const Driver = require('../models/Driver')
const Order = require('../models/Order')
const AdminUser = require('../models/AdminUser')

mongoose.connect('mongodb://localhost:27017/cnber', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

async function seed() {
  await User.deleteMany({})
  await Driver.deleteMany({})
  await Order.deleteMany({})
  await AdminUser.deleteMany({})

  // 👤 创建用户
  const users = await User.insertMany(
    Array.from({ length: 10 }, (_, i) => ({
      phone: '13800138' + (100 + i),
      smsVerified: true,
      role: 'user'
    }))
  )

  // 🚕 创建司机
  const drivers = await Driver.insertMany(
    Array.from({ length: 3 }, (_, i) => ({
      userId: users[i]._id,
      licenseNumber: 'LIC00' + i,
      carPlate: 'CNBER-' + i,
      score: 4.5 + i * 0.1
    }))
  )

  // 📦 创建订单
  await Order.insertMany(
    Array.from({ length: 5 }, (_, i) => ({
      userId: users[i]._id,
      driverId: drivers[i % drivers.length]._id,
      startLocation: 'A区' + i,
      endLocation: 'B区' + i,
      price: 80 + i * 10,
      status: 'completed'
    }))
  )

  // 👮 管理员
  await AdminUser.create({
    email: 'admin@cnber.com',
    password: '123456' // 实际使用中请加密
  })

  console.log('✅ 初始化数据完成')
  mongoose.disconnect()
}

seed()
