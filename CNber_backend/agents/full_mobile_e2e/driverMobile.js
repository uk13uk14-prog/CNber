const driverFsm = require('./driverStateMachine')

function formatTrace(trace) {
  return trace.map((t) => `${t.step}:${t.state}${t.action ? `(${t.action})` : ''}`).join(' → ')
}

async function runUntilLoggedIn(deviceId, phone, password) {
  const result = await driverFsm.runDriverFsm(deviceId, { phone, password, goal: 'logged_in' })
  return { ...result, summary: formatTrace(result.trace) }
}

async function runUntilOrderAccepted(deviceId, phone, password) {
  const result = await driverFsm.runDriverFsm(deviceId, { phone, password, goal: 'order_accepted' })
  return { ...result, summary: formatTrace(result.trace) }
}

async function runUntilTripStarted(deviceId, phone, password) {
  const result = await driverFsm.runDriverFsm(deviceId, { phone, password, goal: 'trip_started' })
  return { ...result, summary: formatTrace(result.trace) }
}

async function runUntilTripCompleted(deviceId, phone, password) {
  const result = await driverFsm.runDriverFsm(deviceId, { phone, password, goal: 'trip_completed' })
  return { ...result, summary: formatTrace(result.trace) }
}

async function loginDriver(deviceId, phone, password) {
  await runUntilLoggedIn(deviceId, phone, password)
}

async function openAssignedOrders() {
  /* FSM 内处理 */
}

async function acceptOrder(deviceId, phone, password) {
  await runUntilOrderAccepted(deviceId, phone, password)
}

async function startTrip(deviceId, phone, password) {
  await runUntilTripStarted(deviceId, phone, password)
}

async function completeTrip(deviceId, phone, password) {
  await runUntilTripCompleted(deviceId, phone, password)
}

module.exports = {
  runUntilLoggedIn,
  runUntilOrderAccepted,
  runUntilTripStarted,
  runUntilTripCompleted,
  detectDriverPage: driverFsm.detectDriverPage,
  loginDriver,
  openAssignedOrders,
  acceptOrder,
  startTrip,
  completeTrip
}
