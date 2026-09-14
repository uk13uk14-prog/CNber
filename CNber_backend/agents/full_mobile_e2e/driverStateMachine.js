/**
 * Driver 页面状态机 — 不假设从登录页开始。
 */
const adb = require('../_shared/adb')
const ui = require('./mobileUi')

const MAX_UNKNOWN = 3
const MAX_STEPS = Number(process.env.E2E_DRIVER_FSM_MAX_STEPS || 50)

const PHONE_LABELS = ['请输入手机号', '手机号', 'Phone number', 'Enter phone', 'Mobile']
const PASSWORD_LABELS = ['请输入密码', '密码', 'Password', 'Enter password']
const LOGIN_LABELS = ['登录', 'Login', 'Sign in', 'Log in']

function extractPagePath(xml) {
  const matches = [...String(xml || '').matchAll(/text="(pages\/[^"\[]+)(?:\[\d+\])?"/g)]
  return matches.length ? matches[matches.length - 1][1] : ''
}

function detectDriverPage(xml) {
  const s = String(xml || '')

  if (/D0002_driver_login|司机登录/i.test(s)) return 'login'
  if (/D0300_driver_main|司机首页|司机端工作台/i.test(s)) return 'dashboard'
  if (/已完成|Trip completed|订单已完成/i.test(s)) return 'completed'
  if (/完成订单|完成行程|Complete trip|Complete order/i.test(s) && /行程中|进行中|in_progress/i.test(s)) {
    return 'in_progress'
  }
  if (/开始行程|Start trip/i.test(s)) return 'trip_detail'
  if (/确认接单|Accept order/i.test(s)) return 'trip_detail'
  if (/指派给我|待接订单|Assigned|我的任务|查看可接订单/i.test(s)) return 'assignments'
  return 'unknown'
}

async function actionLogin(deviceId, phone, password, xml) {
  if (!(await ui.fillInputByLabels(deviceId, PHONE_LABELS, phone, xml))) {
    throw new Error(`Driver login: 未找到手机号输入 (${PHONE_LABELS.join(' / ')})`)
  }
  await ui.sleep(300)
  if (!(await ui.fillInputByLabels(deviceId, PASSWORD_LABELS, password))) {
    throw new Error(`Driver login: 未找到密码输入 (${PASSWORD_LABELS.join(' / ')})`)
  }
  await ui.sleep(300)
  await ui.requireTap(deviceId, LOGIN_LABELS, 'Driver login: 未找到登录按钮')
  await ui.sleep(3500)
  return 'login'
}

async function actionDashboard(deviceId, xml, ctx) {
  const hit = await ui.tapByAnyText(
    deviceId,
    ['我的派单', '我的任务', 'My tasks', '指派给我', 'Assigned', '查看可接订单', '待接订单'],
    xml
  )
  if (!hit) {
    await ui.tapByAnyText(deviceId, ['订单', 'Orders', 'Heathrow', 'Central London'], xml)
  }
  await ui.sleep(2000)
  ctx.openedAssignments = true
  return `dashboard→${hit || 'orders'}`
}

async function actionAssignments(deviceId, xml, ctx) {
  await ui.tapByAnyText(deviceId, ['指派给我', 'Assigned to me', '待接订单', 'Pending'], xml)
  await ui.sleep(1500)
  const accept = await ui.tapByAnyText(deviceId, [
    '确认接单',
    'Accept order',
    'Accept',
    '接单',
    'Take order'
  ])
  if (accept) {
    ctx.orderAccepted = true
    await ui.sleep(2500)
    return `assignments→accept(${accept})`
  }
  if (!ctx.openedAssignments) {
    return actionDashboard(deviceId, xml, ctx)
  }
  throw new Error('Driver assignments: 未找到接单按钮')
}

async function actionTripDetail(deviceId, xml, ctx) {
  const start = await ui.tapByAnyText(deviceId, ['开始行程', 'Start trip', 'Start', '开始', '出发'], xml)
  if (start) {
    ctx.tripStarted = true
    await ui.sleep(2500)
    return `trip_detail→start(${start})`
  }
  const accept = await ui.tapByAnyText(deviceId, ['确认接单', 'Accept order', 'Accept', '接单'], xml)
  if (accept) {
    ctx.orderAccepted = true
    await ui.sleep(2500)
    return `trip_detail→accept(${accept})`
  }
  throw new Error('Driver trip_detail: 未找到开始行程/接单按钮')
}

async function actionInProgress(deviceId, xml, ctx) {
  const done = await ui.tapByAnyText(
    deviceId,
    ['完成订单', 'Complete order', '完成行程', 'Complete trip', '完成', 'Finish'],
    xml
  )
  if (done) {
    ctx.tripCompleted = true
    await ui.sleep(2500)
    return `in_progress→complete(${done})`
  }
  throw new Error('Driver in_progress: 未找到完成按钮')
}

function isLoggedInState(state) {
  return !['login', 'unknown'].includes(state)
}

function goalReached(goal, ctx, state) {
  switch (goal) {
    case 'logged_in':
      return isLoggedInState(state)
    case 'order_accepted':
      return ctx.orderAccepted
    case 'trip_started':
      return ctx.tripStarted
    case 'trip_completed':
      return ctx.tripCompleted || state === 'completed'
    default:
      return false
  }
}

async function runDriverFsm(deviceId, { phone, password, goal }) {
  const ctx = {
    openedAssignments: false,
    orderAccepted: false,
    tripStarted: false,
    tripCompleted: false
  }
  const trace = []
  let unknownStreak = 0

  for (let step = 0; step < MAX_STEPS; step++) {
    const snap = await ui.logKeyNodes(deviceId, `driver_fsm_${step}`, 'driver')
    const state = detectDriverPage(snap.xml)
    const page = extractPagePath(snap.xml) || snap.page
    const entry = { step, state, page, action: null }
    trace.push(entry)
    console.log(`  [driver:fsm] step=${step} state=${state} page=${page}`)

    if (goalReached(goal, ctx, state)) {
      return { trace, ctx, finalState: state, page }
    }

    if (state === 'unknown') {
      unknownStreak++
      entry.action = 'wait'
      if (unknownStreak >= MAX_UNKNOWN) {
        throw new Error(
          `Driver 连续 ${MAX_UNKNOWN} 次无法识别页面 (trace: ${JSON.stringify(trace.slice(-MAX_UNKNOWN))})`
        )
      }
      await ui.sleep(1500)
      continue
    }
    unknownStreak = 0

    let action
    switch (state) {
      case 'login':
        action = await actionLogin(deviceId, phone, password, snap.xml)
        break
      case 'dashboard':
        action = await actionDashboard(deviceId, snap.xml, ctx)
        break
      case 'assignments':
        action = await actionAssignments(deviceId, snap.xml, ctx)
        break
      case 'trip_detail':
        if (goal === 'order_accepted' && !ctx.orderAccepted) {
          action = await actionAssignments(deviceId, snap.xml, ctx)
        } else if (goal === 'trip_started' || goal === 'trip_completed') {
          action = await actionTripDetail(deviceId, snap.xml, ctx)
        } else {
          action = await actionAssignments(deviceId, snap.xml, ctx)
        }
        break
      case 'in_progress':
        action = await actionInProgress(deviceId, snap.xml, ctx)
        break
      case 'completed':
        ctx.tripCompleted = true
        return { trace, ctx, finalState: state, page }
      default:
        action = 'noop'
    }
    entry.action = action
  }

  throw new Error(`Driver FSM 超过最大步数 ${MAX_STEPS} (goal=${goal})`)
}

module.exports = {
  MAX_UNKNOWN,
  MAX_STEPS,
  extractPagePath,
  detectDriverPage,
  runDriverFsm,
  isLoggedInState
}
