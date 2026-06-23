#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const FixedPricingRule = require('../models/FixedPricingRule')

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnber'
  await mongoose.connect(uri)
  await FixedPricingRule.ensureDefaultRules()
  const rules = await FixedPricingRule.find().sort({ serviceType: 1 }).lean()
  console.log('seed_fixed_pricing ok', rules.length)
  for (const r of rules) {
    console.log(`  ${r.serviceType}: ¥${r.customerPriceCny} / £${r.driverPriceGbp}`)
  }
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
