#!/usr/bin/env node
/**
 * 客服工单 V1 smoke
 */
require('dotenv').config()
const assert = require('assert')
const {
  TYPE_LABELS,
  STATUS_LABELS,
  canStaffReadTicket,
  canStaffWriteTicket,
  canStaffCreateTicket,
  financeListTypeFilter
} = require('../utils/supportTicket')

assert.strictEqual(TYPE_LABELS.refund_request, '退款申请')
assert.strictEqual(STATUS_LABELS.pending, '待处理')
assert.strictEqual(canStaffCreateTicket('support'), true)
assert.strictEqual(canStaffCreateTicket('finance'), false)
assert.strictEqual(canStaffReadTicket('finance', { type: 'refund_request' }), true)
assert.strictEqual(canStaffReadTicket('finance', { type: 'complaint' }), false)
assert.strictEqual(canStaffWriteTicket('finance', { type: 'refund_request' }), false)
assert.strictEqual(financeListTypeFilter('finance', 'complaint'), '__none__')
assert.strictEqual(financeListTypeFilter('finance', ''), 'refund_request')

const ctrl = require('../controllers/supportTicketController')
assert.strictEqual(typeof ctrl.listSupportTickets, 'function')
assert.strictEqual(typeof ctrl.createSupportTicket, 'function')
assert.strictEqual(typeof ctrl.addSupportTicketComment, 'function')

async function integration() {
  const mongoose = require('mongoose')
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/cnber'
  await mongoose.connect(uri)
  const SupportTicket = require('../models/SupportTicket')
  assert.ok(SupportTicket.schema.path('ticketNo'))
  assert.ok(SupportTicket.schema.path('operationLogs'))
  await mongoose.disconnect()
}

integration()
  .then(() => console.log('smoke_support_tickets ok'))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
