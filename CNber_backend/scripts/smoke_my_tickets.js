#!/usr/bin/env node
/**
 * 客户/司机「我的工单」smoke
 * 用法: node scripts/smoke_my_tickets.js
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

const CUSTOMER_PHONE = 'smoke_my_ticket_customer@cnber.local'
const DRIVER_PHONE = 'smoke_my_ticket_driver@cnber.local'
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

  const customer = await upsertUser({ phone: CUSTOMER_PHONE, password: '123456', role: 'user' })
  const driver = await upsertUser({ phone: DRIVER_PHONE, password: '123456', role: 'driver' })
  let admin = await User.findOne({ phone: ADMIN_PHONE, role: 'admin' })
  if (!admin) {
    admin = await upsertUser({ phone: ADMIN_PHONE, password: '123456', role: 'admin' })
  }

  let customerOrder = await Order.findOne({ userId: customer._id }).sort({ createdAt: -1 }).lean()
  if (!customerOrder) {
    customerOrder = (
      await Order.create({
        userId: customer._id,
        pickup: 'Smoke Pickup',
        destination: 'Smoke Dropoff',
        serviceType: 'ride',
        status: 'pending',
        orderNo: `SMOKE-MT-C-${Date.now()}`
      })
    ).toObject()
  }

  let driverOrder = await Order.findOne({
    $or: [{ driverId: driver._id }, { assignedDriver: driver._id }]
  })
    .sort({ createdAt: -1 })
    .lean()
  if (!driverOrder) {
    driverOrder = (
      await Order.create({
        userId: customer._id,
        driverId: driver._id,
        assignedDriver: driver._id,
        pickup: 'Driver Pickup',
        destination: 'Driver Dropoff',
        serviceType: 'ride',
        status: 'completed',
        orderNo: `SMOKE-MT-D-${Date.now()}`
      })
    ).toObject()
  }

  const customerCreate = await invoke(
    supportTicketController.createEndUserSupportTicket,
    mockReq(customer, {
      type: 'complaint',
      title: 'Smoke 客户工单',
      description: '客户 smoke 测试',
      orderId: String(customerOrder._id)
    })
  )
  assert.strictEqual(customerCreate.status, 201)
  const customerTicket = customerCreate.body.data.ticket
  assert.strictEqual(customerTicket.requesterRole, 'customer')

  const driverCreate = await invoke(
    supportTicketController.createEndUserSupportTicket,
    mockReq(driver, {
      type: 'order_issue',
      title: 'Smoke 司机工单',
      description: '司机 smoke 测试',
      orderId: String(driverOrder._id)
    })
  )
  assert.strictEqual(driverCreate.status, 201)
  const driverTicket = driverCreate.body.data.ticket
  assert.strictEqual(driverTicket.requesterRole, 'driver')

  const customerMy = await invoke(
    supportTicketController.listMySupportTickets,
    mockReq(customer, {}, {})
  )
  assert.ok(
    (customerMy.body.data.tickets || []).some((t) => String(t._id) === String(customerTicket._id))
  )

  const driverMy = await invoke(
    supportTicketController.listMySupportTickets,
    mockReq(driver, {}, {})
  )
  assert.ok((driverMy.body.data.tickets || []).some((t) => String(t._id) === String(driverTicket._id)))

  const customerDetail = await invoke(
    supportTicketController.getMySupportTicket,
    mockReq(customer, {}, {}, { id: String(customerTicket._id) })
  )
  assert.strictEqual(String(customerDetail.body.data.ticket._id), String(customerTicket._id))
  assert.ok(Array.isArray(customerDetail.body.data.ticket.operationLogs))

  let forbidden = false
  try {
    await invoke(
      supportTicketController.getMySupportTicket,
      mockReq(customer, {}, {}, { id: String(driverTicket._id) })
    )
  } catch (e) {
    forbidden = e.code === 403
  }
  assert.ok(forbidden, '客户不能看司机工单')

  forbidden = false
  try {
    await invoke(
      supportTicketController.getMySupportTicket,
      mockReq(driver, {}, {}, { id: String(customerTicket._id) })
    )
  } catch (e) {
    forbidden = e.code === 403
  }
  assert.ok(forbidden, '司机不能看客户工单')

  const adminList = await invoke(
    supportTicketController.listSupportTickets,
    mockReq(admin, {}, { page: '1', pageSize: '100' })
  )
  const adminRows = adminList.body.data.tickets || []
  assert.ok(adminRows.some((t) => String(t._id) === String(driverTicket._id)))
  assert.strictEqual(
    adminRows.find((t) => String(t._id) === String(driverTicket._id)).requesterRole,
    'driver'
  )

  await SupportTicket.deleteMany({
    _id: { $in: [customerTicket._id, driverTicket._id] }
  })

  await mongoose.disconnect()
  console.log('smoke_my_tickets ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
