/**
 * P0 测试司机种子（User + Driver 双表对齐，可派单）
 *
 * 用法：
 *   cd CNber_backend
 *   node scripts/seedTestDriver.js
 */
require('dotenv').config()

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Driver = require('../models/Driver')

const mongoUrl =
  process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'

const TEST_DRIVER = {
  phone: '13900000001',
  password: '123456',
  role: 'driver',
  status: 'active',
  driverProfile: {
    realName: 'P0测试司机',
    phone: '13900000001',
    status: 'online',
    approvalStatus: 'approved',
    vehiclePlate: 'TEST001',
    vehicleModel: 'Toyota Prius',
    vehicle: {
      plateNo: 'TEST001',
      model: 'Toyota Prius',
      seats: 4
    },
    documents: {
      reviewStatus: 'approved'
    }
  }
}

const DRIVER_DOC = {
  licenseNumber: 'P0-TEST-LIC',
  carPlate: 'TEST001',
  vehiclePlate: 'TEST001',
  vehicleModel: 'Toyota Prius',
  verificationStatus: 'approved',
  isActive: true,
  available: true,
  serviceStatus: 'idle',
  /** 旧版 Driver 模型派单筛选依赖 status=approved */
  status: 'approved',
  score: 5,
  totalOrders: 0,
  serviceTypes: ['pickup', 'dropoff', 'ride'],
  adminNotes: 'P0 seed test driver'
}

async function main() {
  console.log('\n=== CNber seedTestDriver ===\n')
  await mongoose.connect(mongoUrl)

  const hashedPassword = await bcrypt.hash(TEST_DRIVER.password, 10)
  const user = await User.findOneAndUpdate(
    { phone: TEST_DRIVER.phone },
    {
      $set: {
        phone: TEST_DRIVER.phone,
        password: hashedPassword,
        role: TEST_DRIVER.role,
        status: TEST_DRIVER.status,
        driverProfile: TEST_DRIVER.driverProfile
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  let driver = await Driver.findOne({ userId: user._id })
  if (driver) {
    Object.assign(driver, DRIVER_DOC)
    driver.userId = user._id
    await driver.save()
  } else {
    driver = await Driver.create({ ...DRIVER_DOC, userId: user._id })
  }

  // 兼容旧版 Driver 模型（仅 status/carPlate），确保派单接口可见
  await Driver.updateOne(
    { userId: user._id },
    {
      $set: {
        status: 'approved',
        carPlate: DRIVER_DOC.carPlate,
        licenseNumber: DRIVER_DOC.licenseNumber,
        score: DRIVER_DOC.score,
        totalOrders: DRIVER_DOC.totalOrders,
        available: DRIVER_DOC.available,
        serviceStatus: DRIVER_DOC.serviceStatus,
        isActive: DRIVER_DOC.isActive,
        verificationStatus: DRIVER_DOC.verificationStatus
      }
    }
  )
  driver = await Driver.findOne({ userId: user._id })

  console.log('✅ User driver:', {
    id: String(user._id),
    phone: user.phone,
    role: user.role,
    status: user.status,
    approvalStatus: user.driverProfile?.approvalStatus,
    onlineStatus: user.driverProfile?.status
  })
  console.log('✅ Driver doc:', {
    id: String(driver._id),
    userId: String(driver.userId),
    verificationStatus: driver.verificationStatus,
    status: driver.status,
    isActive: driver.isActive,
    available: driver.available,
    serviceStatus: driver.serviceStatus,
    vehiclePlate: driver.vehiclePlate,
    vehicleModel: driver.vehicleModel
  })
  console.log('\n>>> TEST DRIVER READY')
  console.log('driver phone:', TEST_DRIVER.phone)
  console.log('password:', TEST_DRIVER.password)
  console.log('')

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error('>>> FAIL', err.message || err)
  try {
    await mongoose.disconnect()
  } catch (e) {
    /* ignore */
  }
  process.exit(1)
})
