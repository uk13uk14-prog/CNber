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

  const status = await invoke(operationsPackController.getBackupStatus, mockReq(admin))
  assert.strictEqual(status.code, 0)
  assert.strictEqual(status.data.mongoConnected, true)
  assert.ok(typeof status.data.dbSizeMb === 'number')
  assert.ok(typeof status.data.orderCount === 'number')

  const run = await invoke(operationsPackController.runBackup, mockReq(admin))
  assert.strictEqual(run.code, 0)
  assert.strictEqual(run.data.message, '预留')

  await mongoose.disconnect()
  console.log('smoke_backup_status ok')
}

main().catch((e) => { console.error(e); process.exit(1) })
