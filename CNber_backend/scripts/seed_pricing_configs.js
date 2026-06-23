#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const ServiceTypeConfig = require('../models/ServiceTypeConfig')
const VehicleClassConfig = require('../models/VehicleClassConfig')
const { invalidateCatalogCache } = require('../utils/catalogConfig')

const DEFAULT_SERVICE_TYPES = [
  { code: 'point', label: '点对点', sortOrder: 10, remark: 'V1 默认' },
  { code: 'pickup', label: '接机', sortOrder: 20, remark: 'V1 默认' },
  { code: 'dropoff', label: '送机', sortOrder: 30, remark: 'V1 默认' },
  { code: 'charter', label: '包车', sortOrder: 40, remark: 'V1 默认' },
  { code: 'ride', label: '普通用车', sortOrder: 50, remark: 'V1 默认' }
]

const DEFAULT_VEHICLE_CLASSES = [
  { code: 'standard_5', label: '5座普通', seats: 5, sortOrder: 10 },
  { code: 'luxury_5', label: '5座豪华', seats: 5, sortOrder: 20 },
  { code: 'comfort_7', label: '7座舒适', seats: 7, sortOrder: 30 },
  { code: 'luxury_7', label: '7座豪华', seats: 7, sortOrder: 40 },
  { code: 'seater_8', label: '8座', seats: 8, sortOrder: 50 },
  { code: 'seater_9', label: '9座', seats: 9, sortOrder: 60 }
]

async function upsertService(row) {
  await ServiceTypeConfig.findOneAndUpdate(
    { code: row.code },
    {
      $setOnInsert: {
        code: row.code,
        label: row.label,
        enabled: true,
        sortOrder: row.sortOrder ?? 100,
        remark: row.remark || ''
      }
    },
    { upsert: true, new: true }
  )
}

async function upsertVehicle(row) {
  await VehicleClassConfig.findOneAndUpdate(
    { code: row.code },
    {
      $setOnInsert: {
        code: row.code,
        label: row.label,
        seats: row.seats ?? null,
        enabled: true,
        sortOrder: row.sortOrder ?? 100,
        remark: row.remark || ''
      }
    },
    { upsert: true, new: true }
  )
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cnber'
  await mongoose.connect(uri)
  for (const row of DEFAULT_SERVICE_TYPES) {
    await upsertService(row)
    console.log(`  service ${row.code}`)
  }
  for (const row of DEFAULT_VEHICLE_CLASSES) {
    await upsertVehicle(row)
    console.log(`  vehicle ${row.code}`)
  }
  invalidateCatalogCache()
  console.log('seed_pricing_configs ok')
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
