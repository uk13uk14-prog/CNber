#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const Coupon = require('../models/Coupon')
const Campaign = require('../models/Campaign')

const SAMPLE_COUPONS = [
  {
    code: 'NEW100',
    name: '新用户立减100',
    type: 'fixed',
    discountAmountCny: 100,
    minSpendCny: 500,
    serviceTypes: [],
    vehicleClasses: [],
    usageLimit: 1000,
    perUserLimit: 1,
    enabled: true,
    remark: 'V1 示例 — 全服务类型'
  },
  {
    code: 'AIRPORT50',
    name: '接送机立减50',
    type: 'fixed',
    discountAmountCny: 50,
    minSpendCny: 500,
    serviceTypes: ['pickup', 'dropoff'],
    vehicleClasses: [],
    usageLimit: 500,
    perUserLimit: 1,
    enabled: true,
    remark: 'V1 示例 — 接机/送机'
  },
  {
    code: 'CHARTER200',
    name: '包车立减200',
    type: 'fixed',
    discountAmountCny: 200,
    minSpendCny: 2500,
    serviceTypes: ['charter'],
    vehicleClasses: [],
    usageLimit: 200,
    perUserLimit: 1,
    enabled: true,
    remark: 'V1 示例 — 包车'
  }
]

const SAMPLE_CAMPAIGNS = [
  {
    title: '暑期接送机优惠',
    subtitle: '接送机立减 ¥50',
    description: '预订接机或送机服务，输入优惠码 AIRPORT50 享立减。',
    bannerUrl: '',
    linkedCouponCode: 'AIRPORT50',
    targetServiceTypes: ['pickup', 'dropoff'],
    sortOrder: 10,
    enabled: true,
    remark: 'V1 示例活动'
  },
  {
    title: '新用户首单优惠',
    subtitle: '首单立减 ¥100',
    description: '新用户首单满 ¥500 可用优惠码 NEW100。',
    bannerUrl: '',
    linkedCouponCode: 'NEW100',
    targetServiceTypes: [],
    sortOrder: 20,
    enabled: true,
    remark: 'V1 示例活动'
  }
]

function defaultDates() {
  const startAt = new Date()
  startAt.setMonth(startAt.getMonth() - 1)
  const endAt = new Date()
  endAt.setMonth(endAt.getMonth() + 12)
  return { startAt, endAt }
}

async function upsertCoupon(row) {
  const { startAt, endAt } = defaultDates()
  const doc = await Coupon.findOneAndUpdate(
    { code: row.code },
    {
      $setOnInsert: {
        ...row,
        code: row.code,
        usedCount: 0,
        startAt,
        endAt
      }
    },
    { upsert: true, new: true }
  )
  console.log(`  coupon ${row.code} (${doc._id})`)
  return doc
}

async function upsertCampaign(row, couponId) {
  const { startAt, endAt } = defaultDates()
  const key = { title: row.title }
  const doc = await Campaign.findOneAndUpdate(
    key,
    {
      $setOnInsert: {
        ...row,
        linkedCouponId: couponId || null,
        startAt,
        endAt
      }
    },
    { upsert: true, new: true }
  )
  console.log(`  campaign ${row.title}`)
  return doc
}

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/cnber'
  await mongoose.connect(uri)

  const couponMap = new Map()
  for (const row of SAMPLE_COUPONS) {
    const doc = await upsertCoupon(row)
    couponMap.set(row.code, doc)
  }

  for (const row of SAMPLE_CAMPAIGNS) {
    const coupon = couponMap.get(row.linkedCouponCode)
    await upsertCampaign(row, coupon?._id)
  }

  console.log('seed_coupons_campaigns ok')
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
