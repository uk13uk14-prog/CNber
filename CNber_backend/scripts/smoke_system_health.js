#!/usr/bin/env node
require('dotenv').config()
if (!process.env.JWT_SECRET) { console.error('❌ JWT_SECRET'); process.exit(1) }

const assert = require('assert')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const operationsPackController = require('../controllers/operationsPackController')

const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/cnber'

function mockReq(user) {
  return { user: { userId: user._id.toString(), phone: user.phone, role: user.role }, body: {}, query: {}, params: {} }
}

async function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    const res = { json: (p) => resolve(p) }
    Promise.resolve(handler(req, res, reject)).catch(reject)
  })
}

async function main() {
  await mongoose.connect(mongoUrl)
  const hashed = await bcrypt.hash('123456', 10)
  const admin = await User.findOneAndUpdate(
    { phone: 'admin@cnber.local' },
    { $set: { phone: 'admin@cnber.local', password: hashed, role: 'admin', status: 'active' } },
    { upsert: true, new: true }
  )

  const body = await invoke(operationsPackController.getSystemHealth, mockReq(admin))
  assert.strictEqual(body.code, 0)
  const d = body.data
  assert.strictEqual(d.backend, 'ok')
  assert.strictEqual(d.mongodb, 'ok')
  assert.ok(typeof d.diskUsagePercent === 'number')
  assert.ok(typeof d.totalOrders === 'number')
  assert.ok(typeof d.pendingPaymentReview === 'number')
  assert.ok(typeof d.pendingDispatch === 'number')

  await mongoose.disconnect()
  console.log('smoke_system_health ok')
}

main().catch((e) => { console.error(e); process.exit(1) })
