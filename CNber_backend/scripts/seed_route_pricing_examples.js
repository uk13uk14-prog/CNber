#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const RoutePricingRule = require('../models/RoutePricingRule')
const { normalizeLocationKey, vehicleLabelOf } = require('../utils/routePricing')

const EXAMPLES = [
  {
    serviceType: 'point',
    fromLabel: 'London',
    toLabel: 'Birmingham',
    vehicleClass: 'standard_5',
    customerPriceCny: 1600,
    driverPriceGbp: 120,
    remark: '示例：London → Birmingham'
  },
  {
    serviceType: 'point',
    fromLabel: 'London',
    toLabel: 'Manchester',
    vehicleClass: 'standard_5',
    customerPriceCny: 2300,
    driverPriceGbp: 170,
    remark: '示例：London → Manchester'
  },
  {
    serviceType: 'point',
    fromLabel: 'London',
    toLabel: 'Cambridge',
    vehicleClass: 'standard_5',
    customerPriceCny: 1300,
    driverPriceGbp: 100,
    remark: '示例：London → Cambridge'
  },
  {
    serviceType: 'pickup',
    fromLabel: 'Heathrow',
    toLabel: 'Central London',
    vehicleClass: 'standard_5',
    customerPriceCny: 900,
    driverPriceGbp: 75,
    remark: '示例：Heathrow → Central London'
  }
]

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnber'
  await mongoose.connect(uri)
  for (const row of EXAMPLES) {
    const fromKey = normalizeLocationKey(row.fromLabel)
    const toKey = normalizeLocationKey(row.toLabel)
    await RoutePricingRule.findOneAndUpdate(
      {
        serviceType: row.serviceType,
        fromKey,
        toKey,
        vehicleClass: row.vehicleClass
      },
      {
        $setOnInsert: {
          ...row,
          fromKey,
          toKey,
          vehicleLabel: vehicleLabelOf(row.vehicleClass),
          enabled: true
        }
      },
      { upsert: true, new: true }
    )
    console.log(`  ${row.fromLabel} → ${row.toLabel} / ${row.vehicleClass}`)
  }
  console.log('seed_route_pricing_examples ok')
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
