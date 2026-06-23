#!/usr/bin/env node
/**
 * 优惠券 / 活动 V1 smoke
 * 用法: node scripts/smoke_coupons_campaigns.js
 */
require('dotenv').config()
const assert = require('assert')
const {
  normalizeCouponCode,
  getCouponStatus,
  getCampaignStatus,
  calculateCouponDiscount,
  canUseCoupon,
  STATUS,
  CAMPAIGN_STATUS
} = require('../utils/couponEngine')

assert.strictEqual(normalizeCouponCode(' new100 '), 'NEW100')

const now = new Date('2026-06-15T12:00:00.000Z')
const activeCoupon = {
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
  endAt: new Date('2026-12-31')
}

assert.strictEqual(getCouponStatus(activeCoupon, now), STATUS.ACTIVE)

const order900 = { customerPriceCny: 900, serviceType: 'point', vehicleClass: 'standard_5' }
const calc = calculateCouponDiscount(activeCoupon, order900)
assert.strictEqual(calc.valid, true)
assert.strictEqual(calc.discountAmountCny, 100)
assert.strictEqual(calc.payableAmountCny, 800)

const lowSpend = calculateCouponDiscount(activeCoupon, { customerPriceCny: 400 })
assert.strictEqual(lowSpend.valid, false)

const disabledCoupon = { ...activeCoupon, enabled: false }
assert.strictEqual(getCouponStatus(disabledCoupon, now), STATUS.DISABLED)
assert.strictEqual(calculateCouponDiscount(disabledCoupon, order900).valid, false)

const airportCoupon = {
  ...activeCoupon,
  code: 'AIRPORT50',
  discountAmountCny: 50,
  serviceTypes: ['pickup', 'dropoff']
}
const airportOk = canUseCoupon(airportCoupon, { customerPriceCny: 600, serviceType: 'pickup' })
assert.strictEqual(airportOk.ok, true)
const airportBad = canUseCoupon(airportCoupon, { customerPriceCny: 600, serviceType: 'charter' })
assert.strictEqual(airportBad.ok, false)

const campaign = {
  enabled: true,
  startAt: new Date('2026-01-01'),
  endAt: new Date('2026-12-31')
}
assert.strictEqual(getCampaignStatus(campaign, now), CAMPAIGN_STATUS.ACTIVE)

assert.strictEqual(typeof require('../controllers/couponController').listCoupons, 'function')
assert.strictEqual(typeof require('../controllers/campaignController').listCampaigns, 'function')
assert.strictEqual(typeof require('../controllers/marketingPublicController').validatePublicCoupon, 'function')

async function integration() {
  const mongoose = require('mongoose')
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/cnber'
  await mongoose.connect(uri)
  const Coupon = require('../models/Coupon')
  const Campaign = require('../models/Campaign')

  const coupon = await Coupon.findOne({ code: 'NEW100' }).lean()
  if (coupon) {
    const r = calculateCouponDiscount(coupon, order900)
    assert.strictEqual(r.payableAmountCny, 800, 'seed NEW100 payable')
  }

  const linked = await Campaign.findOne({ linkedCouponCode: 'AIRPORT50' }).lean()
  if (coupon && linked) {
    assert.ok(linked.linkedCouponCode === 'AIRPORT50' || linked.title.includes('接送机'))
  }

  const pubNow = new Date()
  const activeCampaigns = await Campaign.find({
    enabled: true,
    startAt: { $lte: pubNow },
    endAt: { $gte: pubNow }
  }).lean()
  for (const c of activeCampaigns) {
    assert.strictEqual(getCampaignStatus(c, pubNow), CAMPAIGN_STATUS.ACTIVE)
  }

  await mongoose.disconnect()
}

integration()
  .then(() => {
    console.log('smoke_coupons_campaigns ok')
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
