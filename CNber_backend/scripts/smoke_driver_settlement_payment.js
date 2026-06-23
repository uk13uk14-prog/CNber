#!/usr/bin/env node
/**
 * 司机结算打款记录 smoke
 * 用法: node scripts/smoke_driver_settlement_payment.js
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
const DriverSettlement = require('../models/DriverSettlement')
const driverSettlementController = require('../controllers/driverSettlementController')
const driverController = require('../controllers/driverController')

const mongoUrl =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/cnber'

const DRIVER_PHONE = 'smoke_settlement_pay_driver@cnber.local'
const ADMIN_PHONE = 'admin@cnber.local'

function mockReq(user, body = {}, query = {}, params = {}) {
  return {
    user: {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role
    },
    body,
    query,
    params,
    ip: '127.0.0.1'
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
    Promise.resolve(handler(req, res, (err) => reject(err))).catch(reject)
  })
}

async function upsertUser({ phone, password, role }) {
  const hashed = await bcrypt.hash(password, 10)
  return User.findOneAndUpdate(
    { phone },
    { $set: { phone, password: hashed, role, status: 'active' } },
    { upsert: true, new: true }
  )
}

async function main() {
  await mongoose.connect(mongoUrl)

  const driver = await upsertUser({ phone: DRIVER_PHONE, password: '123456', role: 'driver' })
  let admin = await User.findOne({ phone: ADMIN_PHONE, role: 'admin' })
  if (!admin) {
    admin = await upsertUser({ phone: ADMIN_PHONE, password: '123456', role: 'admin' })
  }

  const startDate = new Date('2025-06-01T00:00:00.000Z')
  const endDate = new Date('2025-06-03T23:59:59.999Z')

  let settlement = await DriverSettlement.findOneAndUpdate(
    { driverId: driver._id, periodType: 'custom', startDate, endDate },
    {
      $set: {
        periodLabel: 'Smoke 结算',
        driverPhone: driver.phone,
        driverName: 'Smoke Driver',
        orderCount: 2,
        driverSettlementGbp: 120,
        exchangeRate: 9.2,
        payableCny: 1104,
        status: 'pending'
      },
      $setOnInsert: {
        driverId: driver._id,
        periodType: 'custom',
        startDate,
        endDate
      }
    },
    { upsert: true, new: true }
  )

  const patchRes = await invoke(
    driverSettlementController.patchDriverSettlementStatus,
    mockReq(
      admin,
      {
        status: 'paid',
        paymentMethod: 'wise',
        paymentReference: 'WISE-SMOKE-001',
        paymentProofUrl: 'https://example.com/proof.png',
        paymentRemark: '已转账'
      },
      {},
      { id: String(settlement._id) }
    )
  )
  assert.strictEqual(patchRes.status, 200)
  const patched = patchRes.body.data.settlement
  assert.strictEqual(patched.status, 'paid')
  assert.strictEqual(patched.paymentMethod, 'wise')
  assert.strictEqual(patched.paymentReference, 'WISE-SMOKE-001')
  assert.ok(patched.paidAt)

  const payRes = await invoke(
    driverController.listDriverSettlementPayments,
    mockReq(driver, {}, { page: '1', pageSize: '10' })
  )
  assert.strictEqual(payRes.status, 200)
  const payments = payRes.body.data.payments || []
  const found = payments.find((p) => String(p._id) === String(settlement._id))
  assert.ok(found, '司机应能看到打款记录')
  assert.strictEqual(found.paymentMethod, 'wise')
  assert.strictEqual(found.paymentReference, 'WISE-SMOKE-001')
  assert.strictEqual(found.paymentRemark, '已转账')

  await DriverSettlement.deleteOne({ _id: settlement._id })
  await mongoose.disconnect()
  console.log('smoke_driver_settlement_payment ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
