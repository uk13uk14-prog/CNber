#!/usr/bin/env node
/**
 * 审计测试司机账号 User + Driver 对齐（本地或 M1 上运行）
 * 用法: node scripts/_audit_test_driver_account.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Driver = require('../models/Driver')

const PHONE = process.env.SMOKE_DRIVER_PHONE || '13900000001'
const CANDIDATE_PASSWORDS = ['123456', 'Driver123456']

async function main() {
  const mongoUrl =
    process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'
  await mongoose.connect(mongoUrl)

  const user = await User.findOne({ phone: PHONE }).select('+password').lean()
  const driver = user ? await Driver.findOne({ userId: user._id }).lean() : null
  const driverByPhone = await Driver.findOne({ phone: PHONE }).lean()

  const passwordChecks = {}
  if (user?.password) {
    for (const pwd of CANDIDATE_PASSWORDS) {
      passwordChecks[pwd] = await bcrypt.compare(pwd, user.password)
    }
  }

  const report = {
    phone: PHONE,
    user: user
      ? {
          _id: String(user._id),
          phone: user.phone,
          role: user.role,
          status: user.status,
          isActive: user.isActive,
          hasPasswordHash: Boolean(user.password),
          driverProfileApproval:
            user.driverProfile?.approvalStatus ||
            user.driverProfile?.documents?.reviewStatus ||
            null
        }
      : null,
    driverByUserId: driver
      ? {
          _id: String(driver._id),
          userId: driver.userId ? String(driver.userId) : null,
          phone: driver.phone || null,
          status: driver.status,
          verificationStatus: driver.verificationStatus,
          isActive: driver.isActive,
          available: driver.available,
          serviceStatus: driver.serviceStatus
        }
      : null,
    driverByPhoneOnly: driverByPhone && (!driver || String(driverByPhone._id) !== String(driver._id))
      ? { _id: String(driverByPhone._id), userId: driverByPhone.userId ? String(driverByPhone.userId) : null }
      : null,
    userIdAligned:
      user && driver ? String(driver.userId) === String(user._id) : false,
    passwordChecks
  }

  console.log(JSON.stringify(report, null, 2))
  await mongoose.disconnect()
}

main().catch(async (e) => {
  console.error(e)
  try {
    await mongoose.disconnect()
  } catch (_) {
    /* ignore */
  }
  process.exit(1)
})
