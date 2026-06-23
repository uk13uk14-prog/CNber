#!/usr/bin/env node
/**
 * 订单评价 smoke
 * 用法: node scripts/smoke_order_rating.js
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
const OrderRating = require('../models/OrderRating')
const DriverProfile = require('../models/DriverProfile')
const CustomerProfile = require('../models/CustomerProfile')
const ORDER_STATUS = Order.ORDER_STATUS
const orderRatingController = require('../controllers/orderRatingController')

const mongoUrl =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/cnber'

const CUSTOMER_PHONE = 'smoke_rating_customer@cnber.local'
const DRIVER_PHONE = 'smoke_rating_driver@cnber.local'
const OTHER_PHONE = 'smoke_rating_other@cnber.local'

function mockReq(user, body = {}, params = {}) {
  return {
    user: { userId: user._id.toString(), phone: user.phone, role: user.role },
    body,
    params,
    query: {}
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

async function expectError(fn, code) {
  try {
    await fn()
    assert.fail('expected error')
  } catch (e) {
    assert.strictEqual(e.code, code, e.message)
  }
}

async function main() {
  await mongoose.connect(mongoUrl)

  const customer = await upsertUser({ phone: CUSTOMER_PHONE, password: '123456', role: 'user' })
  const driver = await upsertUser({ phone: DRIVER_PHONE, password: '123456', role: 'driver' })
  const other = await upsertUser({ phone: OTHER_PHONE, password: '123456', role: 'user' })

  const pendingOrder = await Order.create({
    userId: customer._id,
    driverId: driver._id,
    pickup: 'Pending',
    destination: 'Drop',
    serviceType: 'ride',
    status: ORDER_STATUS.IN_PROGRESS
  })

  const completedOrder = await Order.create({
    userId: customer._id,
    driverId: driver._id,
    pickup: 'Pickup',
    destination: 'Dropoff',
    serviceType: 'ride',
    status: ORDER_STATUS.COMPLETED,
    driverPriceGbp: 50,
    ratingStatus: 'unrated'
  })

  await OrderRating.deleteMany({ orderId: completedOrder._id })

  const createRes = await invoke(
    orderRatingController.submitOrderRating,
    mockReq(customer, {
      orderId: String(completedOrder._id),
      driverStars: 5,
      serviceStars: 5,
      comment: 'smoke 评价',
      tags: ['准时', '服务好']
    })
  )
  assert.strictEqual(createRes.status, 201)
  assert.strictEqual(createRes.body.data.rating.driverStars, 5)

  const orderAfter = await Order.findById(completedOrder._id).lean()
  assert.strictEqual(orderAfter.ratingStatus, 'rated')

  await expectError(
    () =>
      invoke(
        orderRatingController.submitOrderRating,
        mockReq(customer, {
          orderId: String(completedOrder._id),
          driverStars: 4,
          serviceStars: 4
        })
      ),
    400
  )

  await expectError(
    () =>
      invoke(
        orderRatingController.submitOrderRating,
        mockReq(other, {
          orderId: String(completedOrder._id),
          driverStars: 5,
          serviceStars: 5
        })
      ),
    403
  )

  await expectError(
    () =>
      invoke(
        orderRatingController.submitOrderRating,
        mockReq(customer, {
          orderId: String(pendingOrder._id),
          driverStars: 5,
          serviceStars: 5
        })
      ),
    400
  )

  const driverProfile = await DriverProfile.findOne({ userId: driver._id }).lean()
  assert.ok(driverProfile)
  assert.ok(driverProfile.ratingCount >= 1)
  assert.strictEqual(driverProfile.customerRatingAvg, 5)

  const customerProfile = await CustomerProfile.findOne({ userId: customer._id }).lean()
  assert.ok(customerProfile)
  assert.ok(customerProfile.reviewCount >= 1)
  assert.ok(customerProfile.lastReviewAt)

  const driverListRes = await invoke(
    orderRatingController.listDriverRatings,
    mockReq(driver, {}, {})
  )
  assert.strictEqual(driverListRes.body.code, 0)
  const ratings = driverListRes.body.data.ratings || []
  assert.ok(ratings.some((r) => String(r.orderId) === String(completedOrder._id)))

  const getRes = await invoke(
    orderRatingController.getOrderRating,
    mockReq(customer, {}, { id: String(completedOrder._id) })
  )
  assert.ok(getRes.body.data.rating)

  await OrderRating.deleteMany({ orderId: completedOrder._id })
  await Order.deleteMany({ _id: { $in: [completedOrder._id, pendingOrder._id] } })

  await mongoose.disconnect()
  console.log('smoke_order_rating ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
