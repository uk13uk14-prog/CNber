#!/usr/bin/env node
/**
 * 司机收入中心 smoke
 * 用法: node scripts/smoke_driver_income_center.js
 */
require('dotenv').config()

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET 未设置')
  process.exit(1)
}

const assert = require('assert')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Order = require('../models/Order')
const DriverSettlement = require('../models/DriverSettlement')
const ORDER_STATUS = Order.ORDER_STATUS
const driverController = require('../controllers/driverController')
const settlementController = require('../controllers/driverSettlementController')
const { resolveDriverIncomeGbp } = require('../utils/driverIncome')
const { startOfDayUTC, endOfDayUTC, formatDateOnlyUTC } = require('../utils/driverSettlementPeriod')

const mongoUrl =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/cnber'

const SMOKE_DRIVER_PHONE = 'smoke_driver_income@cnber.local'
const SMOKE_ADMIN_PHONE = 'admin@cnber.local'
const TAG = `SMOKE_INCOME_${Date.now()}`

function mockReq(user, body = {}, query = {}, params = {}) {
  return {
    user: {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role
    },
    body,
    query,
    params
  }
}

async function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload })
      }
    }
    const next = (err) => reject(err)
    Promise.resolve(handler(req, res, next)).catch(reject)
  })
}

async function upsertUser({ phone, password, role, extra = {} }) {
  const hashed = await bcrypt.hash(password, 10)
  return User.findOneAndUpdate(
    { phone },
    { $set: { phone, password: hashed, role, status: 'active', ...extra } },
    { upsert: true, new: true }
  )
}

async function main() {
  assert.strictEqual(resolveDriverIncomeGbp({ driverPriceGbp: 80 }), 80)
  assert.strictEqual(resolveDriverIncomeGbp({ amount: 200, driverPriceGbp: 80 }), 80)
  assert.strictEqual(resolveDriverIncomeGbp({ amount: 200 }), 0)

  await mongoose.connect(mongoUrl)

  const driver = await upsertUser({
    phone: SMOKE_DRIVER_PHONE,
    password: '123456',
    role: 'driver',
    extra: { 'driverProfile.realName': 'Smoke Driver' }
  })

  let admin = await User.findOne({ phone: SMOKE_ADMIN_PHONE, role: 'admin' })
  if (!admin) {
    admin = await upsertUser({ phone: SMOKE_ADMIN_PHONE, password: '123456', role: 'admin' })
  }

  const now = new Date()
  const order = await Order.create({
    userId: driver._id,
    driverId: driver._id,
    pickup: `${TAG} pickup`,
    destination: `${TAG} dropoff`,
    serviceType: 'ride',
    status: ORDER_STATUS.COMPLETED,
    paymentStatus: 'paid',
    driverPriceGbp: 80,
    exchangeRate: 10,
    driverSettlementCny: 800,
    pricingMode: 'fixed',
    updatedAt: now,
    createdAt: now
  })

  const summaryRes = await invoke(
    driverController.getIncomeSummary,
    mockReq(driver)
  )
  assert.strictEqual(summaryRes.status, 200)
  assert.strictEqual(summaryRes.body.code, 0)
  const s1 = summaryRes.body.data
  assert.ok(s1.totalIncomeGbp >= 80, `totalIncomeGbp should include 80, got ${s1.totalIncomeGbp}`)
  assert.ok(Object.prototype.hasOwnProperty.call(s1, 'pendingSettlementGbp'))
  assert.ok(Object.prototype.hasOwnProperty.call(s1, 'paidSettlementGbp'))

  const startDate = startOfDayUTC(now)
  const endDate = endOfDayUTC(now)
  const dayKey = formatDateOnlyUTC(now)
  await DriverSettlement.deleteMany({
    driverId: driver._id,
    periodType: 'daily',
    startDate,
    endDate
  })

  const genRes = await invoke(
    settlementController.generateDriverSettlementBatches,
    mockReq(admin, {
      periodType: 'daily',
      startDate: dayKey,
      endDate: dayKey
    })
  )
  assert.strictEqual(genRes.body.code, 0)

  const batch = await DriverSettlement.findOne({
    driverId: driver._id,
    periodType: 'daily',
    startDate,
    endDate
  }).lean()
  assert.ok(batch, 'settlement batch should exist')
  assert.strictEqual(batch.status, 'pending')
  assert.ok(batch.driverSettlementGbp >= 80)

  const listRes = await invoke(driverController.listDriverSettlements, mockReq(driver))
  assert.strictEqual(listRes.body.code, 0)
  const rows = listRes.body.data.settlements || []
  const pendingRow = rows.find((r) => String(r._id) === String(batch._id))
  assert.ok(pendingRow, 'driver settlements should include pending batch')
  assert.strictEqual(pendingRow.status, 'pending')
  assert.ok(Array.isArray(pendingRow.orders))

  const summaryPending = await invoke(driverController.getIncomeSummary, mockReq(driver))
  const s2 = summaryPending.body.data
  assert.ok(s2.pendingSettlementGbp >= 80)
  assert.ok(s2.pendingSettlementCount >= 1)

  const paidRes = await invoke(
    settlementController.patchDriverSettlementStatus,
    mockReq(admin, { status: 'paid' }, {}, { id: String(batch._id) })
  )
  assert.strictEqual(paidRes.body.code, 0)

  const summaryPaid = await invoke(driverController.getIncomeSummary, mockReq(driver))
  const s3 = summaryPaid.body.data
  assert.ok(s3.paidSettlementGbp >= 80)
  assert.ok(s3.paidSettlementCount >= 1)

  await DriverSettlement.deleteOne({ _id: batch._id })
  await Order.deleteOne({ _id: order._id })

  await mongoose.disconnect()
  console.log('smoke_driver_income_center ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
