#!/usr/bin/env node
/**
 * 订单优惠码快照 smoke
 * 用法: node scripts/smoke_order_coupon.js
 */
require('dotenv').config()
const assert = require('assert')
const { getOrderCustomerPriceCny, resolveCouponSnapshot } = require('../utils/couponOrder')
const { calculateCouponDiscount } = require('../utils/couponEngine')

const orderLike = {
  customerPriceCny: 900,
  serviceType: 'point',
  vehicleClass: 'standard_5',
  exchangeRate: 10
}

assert.strictEqual(getOrderCustomerPriceCny(orderLike), 900)

const coupon = {
  code: 'NEW100',
  type: 'fixed',
  discountAmountCny: 100,
  minSpendCny: 500,
  serviceTypes: [],
  vehicleClasses: [],
  usageLimit: 1000,
  usedCount: 0,
  enabled: true,
  startAt: new Date('2026-01-01'),
  endAt: new Date('2027-12-31')
}

const calc = calculateCouponDiscount(coupon, {
  customerPriceCny: 900,
  serviceType: 'point',
  vehicleClass: 'standard_5'
})
assert.strictEqual(calc.payableAmountCny, 800)

async function integration() {
  const mongoose = require('mongoose')
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/cnber'
  await mongoose.connect(uri)
  const Coupon = require('../models/Coupon')
  const seeded = await Coupon.findOne({ code: 'NEW100' }).lean()
  if (seeded) {
    const snap = await resolveCouponSnapshot(orderLike, 'NEW100')
    assert.strictEqual(snap.couponCode, 'NEW100')
    assert.strictEqual(snap.payableAmountCny, 800)
    assert.strictEqual(snap.originalAmountCny, 900)
    assert.strictEqual(snap.discountAmountCny, 100)
  }
  await mongoose.disconnect()
}

integration()
  .then(() => console.log('smoke_order_coupon ok'))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
