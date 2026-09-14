const clientFsm = require('./clientStateMachine')
const vehicleSelect = require('./clientVehicleSelect')

function formatTrace(trace) {
  return trace.map((t) => `${t.step}:${t.state}${t.action ? `(${t.action})` : ''}`).join(' → ')
}

async function runUntilLoggedIn(deviceId, phone, password) {
  const result = await clientFsm.runClientFsm(deviceId, { phone, password, goal: 'logged_in' })
  return { ...result, summary: formatTrace(result.trace) }
}

async function runUntilOrderSubmitted(deviceId, phone, password) {
  const result = await clientFsm.runClientFsm(deviceId, { phone, password, goal: 'order_submitted' })
  return { ...result, summary: formatTrace(result.trace) }
}

async function runUntilPaymentSubmitted(deviceId, phone, password) {
  const result = await clientFsm.runClientFsm(deviceId, { phone, password, goal: 'payment_submitted' })
  return { ...result, summary: formatTrace(result.trace) }
}

async function runUntilCompletedInHistory(deviceId, phone, password) {
  const result = await clientFsm.runClientFsm(deviceId, {
    phone,
    password,
    goal: 'history_completed'
  })
  return { ...result, summary: formatTrace(result.trace) }
}

/** @deprecated 使用 runUntilLoggedIn */
async function loginClient(deviceId, phone, password) {
  await runUntilLoggedIn(deviceId, phone, password)
}

/** @deprecated 使用 runUntilOrderSubmitted */
async function openPickupOrderForm() {
  /* FSM 内处理 */
}

/** @deprecated */
async function fillPickupOrder() {
  /* FSM 内处理 */
}

/** @deprecated */
async function submitDepositPayment(deviceId, phone, password) {
  await runUntilPaymentSubmitted(deviceId, phone, password)
}

/** @deprecated */
async function verifyCompletedInHistory(deviceId, phone, password) {
  const r = await runUntilCompletedInHistory(deviceId, phone, password)
  return r.summary
}

async function selectVehicleOnOrderForm(deviceId, options = {}) {
  return vehicleSelect.selectVehicleType(deviceId, options)
}

module.exports = {
  runUntilLoggedIn,
  runUntilOrderSubmitted,
  runUntilPaymentSubmitted,
  runUntilCompletedInHistory,
  detectClientPage: clientFsm.detectClientPage,
  selectVehicleOnOrderForm,
  MAX_RETRIES: vehicleSelect.MAX_RETRIES,
  PROFILES: vehicleSelect.PROFILES,
  ...vehicleSelect,
  loginClient,
  openPickupOrderForm,
  fillPickupOrder,
  submitDepositPayment,
  verifyCompletedInHistory
}
