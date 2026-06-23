#!/usr/bin/env node
/**
 * 客户端客服工单 smoke
 * 用法: node scripts/smoke_client_support_ticket.js
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
const supportTicketController = require('../controllers/supportTicketController')

const mongoUrl =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/cnber'

const SMOKE_PHONE = 'smoke_client_ticket@cnber.local'
const ADMIN_PHONE = 'admin@cnber.local'

function mockReq(user, body = {}, query = {}) {
  return {
    user: {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role
    },
    body,
    query,
    params: {},
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
    const next = (err) => reject(err)
    Promise.resolve(handler(req, res, next)).catch(reject)
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

  assert.strictEqual(typeof supportTicketController.createCustomerSupportTicket, 'function')
  assert.strictEqual(typeof supportTicketController.listMySupportTickets, 'function')

  const customer = await upsertUser({
    phone: SMOKE_PHONE,
    password: '123456',
    role: 'user'
  })

  let admin = await User.findOne({ phone: ADMIN_PHONE, role: 'admin' })
  if (!admin) {
    admin = await upsertUser({ phone: ADMIN_PHONE, password: '123456', role: 'admin' })
  }

  let order = await Order.findOne({ userId: customer._id }).sort({ createdAt: -1 }).lean()
  if (!order) {
    order = (
      await Order.create({
        userId: customer._id,
        pickup: 'Smoke Pickup',
        destination: 'Smoke Dropoff',
        serviceType: 'ride',
        status: 'pending',
        orderNo: `SMOKE-ST-${Date.now()}`
      })
    ).toObject()
  }

  const createRes = await invoke(
    supportTicketController.createCustomerSupportTicket,
    mockReq(customer, {
      type: 'complaint',
      title: 'Smoke 投诉测试',
      description: '客户端工单 smoke 自动创建',
      priority: 'normal',
      orderId: String(order._id)
    })
  )

  assert.strictEqual(createRes.status, 201)
  assert.strictEqual(createRes.body.code, 0)
  const ticket = createRes.body.data.ticket
  assert.ok(ticket._id)
  assert.strictEqual(ticket.type, 'complaint')
  assert.strictEqual(ticket.requesterRole, 'customer')
  assert.strictEqual(ticket.status, 'pending')
  assert.strictEqual(String(ticket.requesterUserId), String(customer._id))
  assert.strictEqual(ticket.requesterPhone, customer.phone)
  assert.ok(ticket.orderNo || ticket.orderId)

  const myRes = await invoke(
    supportTicketController.listMySupportTickets,
    mockReq(customer, {}, {})
  )
  assert.strictEqual(myRes.status, 200)
  assert.strictEqual(myRes.body.code, 0)
  const mine = myRes.body.data.tickets || []
  assert.ok(mine.some((t) => String(t._id) === String(ticket._id)))

  const adminRes = await invoke(
    supportTicketController.listSupportTickets,
    mockReq(admin, {}, { page: '1', pageSize: '50' })
  )
  assert.strictEqual(adminRes.status, 200)
  const adminRows = adminRes.body.data.tickets || []
  const found = adminRows.find((t) => String(t._id) === String(ticket._id))
  assert.ok(found, 'admin 列表应包含客户端工单')
  assert.strictEqual(found.requesterRole, 'customer')
  assert.strictEqual(found.typeLabel, '投诉')

  await SupportTicket.deleteOne({ _id: ticket._id })

  await mongoose.disconnect()
  console.log('smoke_client_support_ticket ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
