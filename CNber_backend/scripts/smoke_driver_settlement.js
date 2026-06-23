#!/usr/bin/env node
/**
 * 司机结算周期 V1 smoke
 */
require('dotenv').config()
const assert = require('assert')
const {
  parsePeriodInput,
  resolveListDateRange,
  buildPeriodLabel,
  startOfDayUTC,
  endOfDayUTC,
  formatDateOnlyUTC
} = require('../utils/driverSettlementPeriod')

const daily = parsePeriodInput({
  periodType: 'daily',
  startDate: '2026-06-22',
  endDate: '2026-06-22'
})
assert.strictEqual(daily.periodType, 'daily')
assert.strictEqual(daily.periodLabel, '2026-06-22')

const three = parsePeriodInput({
  periodType: 'three_day',
  startDate: '2026-06-22',
  endDate: '2026-06-24'
})
assert.strictEqual(three.periodLabel, '2026-06-22 ~ 2026-06-24')

const range = resolveListDateRange({ quick: 'last3d' })
assert.ok(range.startDate <= range.endDate)

const ctrl = require('../controllers/driverSettlementController')
assert.strictEqual(typeof ctrl.generateDriverSettlementBatches, 'function')
assert.strictEqual(typeof ctrl.listDriverSettlementBatches, 'function')
assert.strictEqual(typeof ctrl.patchDriverSettlementStatus, 'function')

async function integration() {
  const mongoose = require('mongoose')
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/cnber'
  await mongoose.connect(uri)
  const DriverSettlement = require('../models/DriverSettlement')
  assert.ok(DriverSettlement.schema.path('periodType'))
  assert.ok(DriverSettlement.schema.path('payableCny'))
  await mongoose.disconnect()
}

integration()
  .then(() => console.log('smoke_driver_settlement ok'))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
