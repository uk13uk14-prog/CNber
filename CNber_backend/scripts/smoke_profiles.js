#!/usr/bin/env node
/**
 * 验证订单 → profile 聚合逻辑
 * 用法: node scripts/smoke_profiles.js
 */
const assert = require('assert')

// buildRouteMap 未导出 — 通过 aggregate 间接测；这里测纯函数逻辑
const Order = require('../models/Order')
const { ORDER_STATUS } = Order

function routeLabel(order, field) {
  if (field === 'from') {
    return String(order.routeFromLabel || order.pickupAirport || order.pickup || '').trim()
  }
  return String(order.routeToLabel || order.dropoffAirport || order.destination || '').trim()
}

function testRouteAggregation() {
  const orders = [
    {
      pickup: 'Heathrow T5',
      destination: 'London',
      routeFromLabel: '',
      routeToLabel: '',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01')
    },
    {
      pickup: 'Heathrow T5',
      destination: 'London',
      createdAt: new Date('2025-02-01'),
      updatedAt: new Date('2025-02-01')
    }
  ]
  const map = new Map()
  for (const o of orders) {
    const from = routeLabel(o, 'from')
    const to = routeLabel(o, 'to')
    const key = `${from}→${to}`
    const prev = map.get(key)
    if (prev) prev.count += 1
    else map.set(key, { from, to, count: 1 })
  }
  const routes = [...map.values()]
  assert.strictEqual(routes.length, 1)
  assert.strictEqual(routes[0].count, 2)
  assert.ok(routes[0].from.includes('Heathrow'))
}

function testOrderStatusConstants() {
  assert.ok(ORDER_STATUS.COMPLETED)
  assert.ok(ORDER_STATUS.CANCELLED)
}

function testProfileSyncExports() {
  const ps = require('../utils/profileSync')
  assert.strictEqual(typeof ps.syncCustomerProfileFromOrder, 'function')
  assert.strictEqual(typeof ps.syncDriverProfileFromOrder, 'function')
  assert.strictEqual(typeof ps.syncProfilesAfterOrderCompleted, 'function')
  assert.strictEqual(typeof ps.syncProfilesAfterOrderAssigned, 'function')
  assert.strictEqual(typeof ps.fireProfileSync, 'function')
}

function testCustomerProfileModel() {
  const CustomerProfile = require('../models/CustomerProfile')
  const schema = CustomerProfile.schema.obj
  assert.ok(schema.userId)
  assert.ok(schema.marketingConsent)
  assert.ok(schema.marketingOptOutAt)
  assert.ok(schema.aiProfileSummary)
}

function testDriverProfileModel() {
  const DriverProfile = require('../models/DriverProfile')
  const schema = DriverProfile.schema.obj
  assert.ok(schema.driverId)
  assert.ok(schema.driverSettlementTotalGbp)
  assert.ok(schema.riskFlags)
}

function testAIProfileInsightModel() {
  const AIProfileInsight = require('../models/AIProfileInsight')
  const schema = AIProfileInsight.schema.obj
  assert.ok(schema.profileType)
  assert.ok(schema.profileId)
  assert.ok(schema.summary)
  assert.ok(schema.tags)
  assert.ok(schema.riskLevel)
  assert.ok(schema.recommendations)
  assert.ok(schema.version)
}

function testAiInsightEngineInternals() {
  const { _internals } = require('../utils/aiProfileInsightEngine')
  assert.strictEqual(_internals.isAirportOrder({ serviceType: 'pickup', pickup: 'London' }), true)
  assert.strictEqual(
    _internals.isAirportOrder({ pickup: 'Heathrow T5', destination: 'Camden' }),
    true
  )
  assert.strictEqual(_internals.textHasKeyword('Gatwick Airport', ['gatwick']), true)
  assert.strictEqual(_internals.orderAmountCny({ payableAmountCny: 900 }), 900)
}

testRouteAggregation()
testOrderStatusConstants()
testProfileSyncExports()
testCustomerProfileModel()
testDriverProfileModel()
testAIProfileInsightModel()
testAiInsightEngineInternals()

console.log('smoke_profiles ok')
