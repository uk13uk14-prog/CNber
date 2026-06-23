/**
 * P0 微信/支付宝收款账户种子（upsert by method）
 *
 * 用法：
 *   cd CNber_backend
 *   node scripts/seedPaymentAccounts.js
 *
 * 环境变量：MONGO_URI 或 MONGO_URL（默认 mongodb://localhost:27017/cnber）
 */
require('dotenv').config()

const mongoose = require('mongoose')
const PaymentAccount = require('../models/PaymentAccount')

const mongoUrl =
  process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'

const BASE = 'http://192.168.1.187:3100/uploads/payment-accounts'

const SEEDS = [
  {
    method: 'wechat',
    paymentType: 'wechat',
    displayName: 'CNber 微信收款',
    accountName: 'CNber',
    qrCodeUrl: `${BASE}/wechat-qr.jpg`,
    qrImage: `${BASE}/wechat-qr.jpg`,
    wechatQrImage: `${BASE}/wechat-qr.jpg`,
    paymentLink: '',
    enabled: true,
    isActive: true,
    sortOrder: 1
  },
  {
    method: 'alipay',
    paymentType: 'alipay',
    displayName: 'CNber 支付宝收款',
    accountName: 'CNber',
    qrCodeUrl: `${BASE}/alipay-qr.jpg`,
    qrImage: `${BASE}/alipay-qr.jpg`,
    alipayQrImage: `${BASE}/alipay-qr.jpg`,
    paymentLink: '请稍后替换真实支付宝收款链接',
    enabled: true,
    isActive: true,
    sortOrder: 2
  }
]

async function upsertByMethod(seed) {
  const method = seed.method
  const existing = await PaymentAccount.findOne({
    $or: [{ method }, { paymentType: method }]
  })

  if (existing) {
    existing.set(seed)
    await existing.save()
    return { action: 'updated', id: existing._id, method }
  }

  const doc = await PaymentAccount.create(seed)
  return { action: 'created', id: doc._id, method }
}

async function main() {
  console.log('\n=== CNber PaymentAccount Seed ===\n')
  console.log(`MongoDB: ${mongoUrl}\n`)

  await mongoose.connect(mongoUrl)

  const results = []
  for (const seed of SEEDS) {
    const r = await upsertByMethod(seed)
    results.push(r)
    console.log(`  ✓ ${r.action} ${r.method} — ${r.id}`)
  }

  const publicRows = await PaymentAccount.find({
    method: { $in: ['wechat', 'alipay'] },
    enabled: { $ne: false },
    isActive: { $ne: false }
  })
    .sort({ sortOrder: 1 })
    .lean()

  console.log('\n--- 当前 wechat/alipay 公开可用账户 ---')
  for (const row of publicRows) {
    console.log(
      JSON.stringify({
        id: String(row._id),
        method: row.method,
        displayName: row.displayName,
        accountName: row.accountName,
        enabled: row.enabled,
        isActive: row.isActive,
        wechatQrImage: row.wechatQrImage,
        alipayQrImage: row.alipayQrImage,
        paymentLink: row.paymentLink
      })
    )
  }

  console.log('\n>>> DONE\n')
  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error('>>> FAIL', err.message || err)
  try {
    await mongoose.disconnect()
  } catch (e) {
    /* ignore */
  }
  process.exit(1)
})
