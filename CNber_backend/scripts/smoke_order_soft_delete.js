#!/usr/bin/env node
const assert = require('assert')
const { canSoftDeleteOrder } = require('../utils/orderSoftDelete')

const deletable = canSoftDeleteOrder({
  _id: '1',
  status: 'quoted',
  depositStatus: 'unpaid',
  paymentStatus: 'unpaid'
})
assert.strictEqual(deletable.ok, true)

const paid = canSoftDeleteOrder({
  _id: '2',
  status: 'deposit_paid',
  depositStatus: 'confirmed',
  depositPaid: true
})
assert.strictEqual(paid.ok, false)

const assigned = canSoftDeleteOrder({
  _id: '3',
  status: 'assigned',
  driverId: 'd1',
  depositStatus: 'unpaid'
})
assert.strictEqual(assigned.ok, false)

const cancelled = canSoftDeleteOrder({
  _id: '4',
  status: 'cancelled',
  depositStatus: 'unpaid'
})
assert.strictEqual(cancelled.ok, true)

console.log('smoke_order_soft_delete ok')
