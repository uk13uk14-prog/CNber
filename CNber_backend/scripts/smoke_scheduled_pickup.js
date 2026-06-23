#!/usr/bin/env node
/** node scripts/smoke_scheduled_pickup.js */
const assert = require('assert')
const {
  parseScheduledAtFromBody,
  assertScheduledPickup24h
} = require('../utils/scheduledPickup')

const future = new Date(Date.now() + 25 * 60 * 60 * 1000)
const futureIso = future.toISOString()
const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

assert.ok(parseScheduledAtFromBody({ scheduledAt: futureIso }))
assert.ok(
  parseScheduledAtFromBody({
    pickupDetail: 'Terminal 2026-12-25 14:00 flight BA123'
  })
)

try {
  assertScheduledPickup24h({ scheduledAt: soon })
  assert.fail('should throw for <24h')
} catch (e) {
  assert.strictEqual(e.message, '请至少提前 24 小时预约用车')
}

assertScheduledPickup24h({ scheduledAt: futureIso })
console.log('smoke_scheduled_pickup ok')
