#!/usr/bin/env node
/**
 * Mobile Admin alerts smoke
 * 用法: node scripts/smoke_mobile_alerts.js
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
const SupportTicket = require('../models/SupportTicket')
const DriverSettlement = require('../models/DriverSettlement')
const adminController = require('../controllers/adminController')

const mongoUrl =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/cnber'

const ADMIN_PHONE = 'admin@cnber.local'

function mockReq(user) {
  return { user: { userId: user._id.toString(), phone: user.phone, role: user.role }, body: {}, query: {}, params: {} }
}

async function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this },
      json(payload) { resolve({ status: this.statusCode, body: payload }) }
    }
    Promise.resolve(handler(req, res, (err) => reject(err))).catch(reject)
  })
}

async function upsertAdmin() {
  const hashed = await bcrypt.hash('123456', 10)
  return User.findOneAndUpdate(
    { phone: ADMIN_PHONE },
    { $set: { phone: ADMIN_PHONE, password: hashed, role: 'admin', status: 'active' } },
    { upsert: true, new: true }
  )
}

async function main() {
  await mongoose.connect(mongoUrl)
  const admin = await upsertAdmin()

  const order = await Order.create({
    userId: admin._id,
    pickup: 'Alert',
    destination: 'Drop',
    serviceType: 'ride',
    status: 'pending',
    depositStatus: 'submitted',
    orderNo: `SMOKE-MA-${Date.now()}`
  })

  const ticket = await SupportTicket.create({
    ticketNo: `ST-MA-${Date.now()}`,
    type: 'other',
    title: 'alert smoke',
    description: 'test',
    status: 'pending',
    requesterRole: 'customer'
  })

  const settlement = await DriverSettlement.create({
    periodType: 'custom',
    startDate: new Date('2025-06-10'),
    endDate: new Date('2025-06-10'),
    periodLabel: 'smoke',
    driverId: admin._id,
    driverPhone: admin.phone,
    orderCount: 1,
    driverSettlementGbp: 10,
    exchangeRate: 9,
    payableCny: 90,
    status: 'pending'
  })

  const res = await invoke(adminController.getMobileDashboard, mockReq(admin))
  assert.strictEqual(res.status, 200)
  const data = res.body.data
  assert.ok(Array.isArray(data.alerts))
  assert.ok(data.alerts.some((a) => a.type === 'payment_review' && a.createdAt))
  assert.ok(data.alerts.some((a) => a.type === 'support_ticket'))
  assert.ok(data.alerts.some((a) => a.type === 'driver_settlement'))
  assert.strictEqual(typeof data.urgentCount, 'number')
  assert.ok(data.pendingSettlementCount >= 1)

  await Order.deleteOne({ _id: order._id })
  await SupportTicket.deleteOne({ _id: ticket._id })
  await DriverSettlement.deleteOne({ _id: settlement._id })
  await mongoose.disconnect()
  console.log('smoke_mobile_alerts ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
