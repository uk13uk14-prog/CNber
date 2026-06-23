#!/usr/bin/env node
/**
 * CRM 营销记录 smoke
 * 用法: node scripts/smoke_crm_marketing_logs.js
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
const MarketingAudience = require('../models/MarketingAudience')
const MarketingLog = require('../models/MarketingLog')
const crmController = require('../controllers/crmController')

const mongoUrl =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/cnber'

const ADMIN_PHONE = 'admin@cnber.local'

function mockReq(user, body = {}, query = {}, params = {}) {
  return {
    user: {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
      displayName: user.phone
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
      setHeader() {},
      send(content) {
        resolve({ status: this.statusCode, body: content })
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload })
      }
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

  const audience = await MarketingAudience.create({
    name: `Smoke Audience ${Date.now()}`,
    description: 'smoke',
    filters: { preset: 'high_value' },
    customerIds: [],
    count: 3,
    createdBy: { userId: admin._id, phone: admin.phone, displayName: admin.phone }
  })

  const exportRes = await invoke(
    crmController.exportAudience,
    mockReq(admin, {}, {}, { id: String(audience._id) })
  )
  assert.strictEqual(exportRes.status, 200)
  assert.ok(String(exportRes.body).includes('phone'))

  const exportLog = await MarketingLog.findOne({
    audienceId: audience._id,
    action: 'export_csv'
  }).lean()
  assert.ok(exportLog, '导出应写入 MarketingLog')
  assert.strictEqual(exportLog.action, 'export_csv')

  const noteRes = await invoke(
    crmController.createMarketingLog,
    mockReq(admin, {
      audienceId: String(audience._id),
      action: 'manual_contact',
      remark: '已通过微信群发送活动'
    })
  )
  assert.strictEqual(noteRes.status, 201)
  assert.strictEqual(noteRes.body.data.log.action, 'manual_contact')

  const listRes = await invoke(
    crmController.listMarketingLogs,
    mockReq(admin, {}, { audienceId: String(audience._id), page: '1', pageSize: '20' })
  )
  assert.strictEqual(listRes.status, 200)
  const logs = listRes.body.data.logs || []
  assert.ok(logs.length >= 2)
  assert.ok(logs.some((l) => l.action === 'export_csv'))
  assert.ok(logs.some((l) => l.action === 'manual_contact'))

  await MarketingLog.deleteMany({ audienceId: audience._id })
  await MarketingAudience.deleteOne({ _id: audience._id })
  await mongoose.disconnect()
  console.log('smoke_crm_marketing_logs ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
