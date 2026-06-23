/**
 * payOrder / ready_to_start 防线 smoke（无需 DB）
 */
const {
  applyReadyToStartStatus,
  assertReadyToStartAllowed,
  orderHasAssignedDriver
} = require('../utils/orderPaymentFlow')

let failed = 0

function assert(name, cond) {
  if (!cond) {
    console.error('FAIL:', name)
    failed += 1
  } else {
    console.log('OK:', name)
  }
}

const noDriver = { _id: '1', status: 'deposit_paid', driverId: null, assignedDriver: null }
const withDriver = {
  _id: '2',
  status: 'assigned',
  driverId: '69eb518cc86ce945794f1939',
  assignedDriver: '69eb518cc86ce945794f1939'
}

assert('no driver', !orderHasAssignedDriver(noDriver))
assert('has driverId', orderHasAssignedDriver(withDriver))

const stripped = applyReadyToStartStatus(noDriver, {
  paymentStatus: 'paid',
  status: 'ready_to_start'
})
assert('strip ready_to_start without driver', stripped.status === undefined)
assert('keep paymentStatus', stripped.paymentStatus === 'paid')

const kept = applyReadyToStartStatus(withDriver, {
  status: 'ready_to_start',
  paymentStage: 'balance_confirmed'
})
assert('keep ready_to_start with driver', kept.status === 'ready_to_start')

let threw = false
try {
  assertReadyToStartAllowed(noDriver, 'ready_to_start')
} catch (e) {
  threw = e.code === 400
}
assert('assertReadyToStartAllowed throws without driver', threw)

try {
  assertReadyToStartAllowed(withDriver, 'ready_to_start')
  assert('assertReadyToStartAllowed passes with driver', true)
} catch {
  assert('assertReadyToStartAllowed passes with driver', false)
}

// simulate payOrder remaining patch must not include status
const remainingPatch = applyReadyToStartStatus(noDriver, {
  paymentStage: 'balance_submitted',
  paymentStatus: 'pending',
  balanceStatus: 'submitted'
})
assert('remaining patch no status', remainingPatch.status === undefined)
assert('remaining patch stage', remainingPatch.paymentStage === 'balance_submitted')

console.log(failed ? `\n${failed} failed` : '\nAll payOrder guard checks passed')
process.exit(failed ? 1 : 0)
