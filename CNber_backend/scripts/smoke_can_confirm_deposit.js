/**
 * Smoke: canConfirmDeposit 新/旧流程
 * node scripts/smoke_can_confirm_deposit.js
 */
const assert = require('assert')
const { canConfirmDeposit } = require('../utils/orderPaymentSync')

const cases = [
  {
    name: 'CNB-20260622-001 脏数据：submitted + depositPaid=true',
    order: {
      depositStatus: 'submitted',
      paymentStage: 'deposit_submitted',
      paymentStatus: 'pending',
      depositPaid: true,
      payment: { depositStatus: 'pending' }
    },
    expect: true
  },
  {
    name: '已确认不可重复',
    order: {
      depositStatus: 'confirmed',
      paymentStage: 'deposit_confirmed',
      depositPaid: true
    },
    expect: false
  },
  {
    name: '旧单无 paymentStage，未付可确认',
    order: { depositStatus: 'unpaid', paymentStage: 'none', depositPaid: false },
    expect: true
  },
  {
    name: '旧单无 paymentStage，depositPaid 已标记不可再确认',
    order: { depositStatus: 'unpaid', paymentStage: 'none', depositPaid: true },
    expect: false
  },
  {
    name: 'deposit_pending 不可确认',
    order: {
      depositStatus: 'unpaid',
      paymentStage: 'deposit_pending',
      depositPaid: false
    },
    expect: false
  },
  {
    name: 'paymentStage=deposit_submitted 可确认',
    order: {
      depositStatus: 'unpaid',
      paymentStage: 'deposit_submitted',
      depositPaid: true
    },
    expect: true
  }
]

let failed = 0
for (const c of cases) {
  const got = canConfirmDeposit(c.order)
  if (got !== c.expect) {
    console.error('FAIL', c.name, { expect: c.expect, got })
    failed++
  } else {
    console.log('OK', c.name)
  }
}

if (failed) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nall smoke cases passed')
