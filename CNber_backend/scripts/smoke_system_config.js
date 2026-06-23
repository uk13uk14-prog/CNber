#!/usr/bin/env node
const assert = require('assert')
const {
  CONFIG_KEYS,
  DEFAULTS,
  toPublicPayload,
  toAdminPayload,
  bodyToPatch
} = require('../utils/systemConfig')

function normalizeValue(key, value) {
  if (key === 'minimum_booking_hours') return parseInt(value, 10)
  if (key === 'marketing_enabled') return value === true || value === 'true'
  return value
}

assert.ok(CONFIG_KEYS.PLATFORM_NAME === 'platform_name')
assert.ok(DEFAULTS.platform_name === 'CNber')
assert.strictEqual(normalizeValue('minimum_booking_hours', '48'), 48)
assert.strictEqual(normalizeValue('marketing_enabled', true), true)
assert.strictEqual(normalizeValue('marketing_enabled', 'false'), false)

const map = { ...DEFAULTS, announcement: '测试公告' }
const pub = toPublicPayload(map)
assert.strictEqual(pub.platformName, 'CNber')
assert.strictEqual(pub.announcement, '测试公告')
assert.strictEqual(pub.minimumBookingHours, 24)

const admin = toAdminPayload(map)
assert.ok(admin.platform.companyName)
assert.ok(admin.legal)

const patch = bodyToPatch({
  platform: { platformName: 'CNber Test' },
  marketing: { marketingEnabled: true }
})
assert.strictEqual(patch.platform_name, 'CNber Test')
assert.strictEqual(patch.marketing_enabled, true)

const ctrl = require('../controllers/systemConfigController')
assert.strictEqual(typeof ctrl.getPublicSystemConfig, 'function')
assert.strictEqual(typeof ctrl.putAdminSystemConfig, 'function')

console.log('smoke_system_config ok')
