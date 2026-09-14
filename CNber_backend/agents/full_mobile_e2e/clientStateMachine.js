/**
 * Client 页面状态机 — 不假设从登录页开始。
 */
const adb = require('../_shared/adb')
const ui = require('./mobileUi')
const clientMobile = require('./clientMobile')

const MAX_UNKNOWN = 3
const MAX_STEPS = Number(process.env.E2E_CLIENT_FSM_MAX_STEPS || 50)

const PHONE_LABELS = ['请输入手机号', '手机号', 'Phone number', 'Enter phone', 'Mobile']
const PASSWORD_LABELS = ['请输入密码', '密码', 'Password', 'Enter password']
const LOGIN_LABELS = ['登录', 'Login', 'Sign in', 'Log in']
const AGREEMENT_LABELS = ['我已阅读并同意', 'I have read', 'Agree']
const WELCOME_ENTER_LABELS = ['立即进入', 'Enter', 'Get started', '开始使用']

function extractPagePath(xml) {
  const matches = [...String(xml || '').matchAll(/text="(pages\/[^"\[]+)(?:\[\d+\])?"/g)]
  return matches.length ? matches[matches.length - 1][1] : ''
}

function isDatePickerOverlay(xml) {
  return /android:id\/datePicker|date_picker_header/i.test(String(xml || ''))
}

async function dismissSystemOverlay(deviceId, xml) {
  if (isDatePickerOverlay(xml)) {
    const hit =
      (await ui.tapByAnyText(deviceId, ['确定', 'OK', 'Confirm'], xml)) ||
      (await ui.tapByAnyText(deviceId, ['取消', 'Cancel'], xml))
    if (hit) {
      await ui.sleep(800)
      return 'dismiss_date_picker'
    }
  }
  return null
}

function detectClientPage(xml) {
  const s = String(xml || '')
  const page = extractPagePath(s).replace(/\[\d+\]$/, '')

  if (isDatePickerOverlay(s)) return 'order_form'
  if (/A0202/i.test(page)) return 'order_history'
  if (/A0106|A0107/i.test(page)) return 'payment'
  if (/A010[2-8]/i.test(page)) return 'order_form'
  if (/A0101/i.test(page)) return 'service_type'
  if (/A0002/i.test(page)) return 'login'
  if (/A0001/i.test(page)) return 'welcome'
  if (/A0300/i.test(page)) return 'service_type'

  if (/A0202_client_order_history|订单历史|Order history/i.test(s)) return 'order_history'
  if (/A0106[a]?_client_payment|A0107_client_wait|提交付款信息|付款人姓名|wait_driver/i.test(s)) {
    return 'payment'
  }
  if (/A010[2-8]_client_order|创建订单|Postcode \(e\.g\.|Street \/ Area|打点服务|接机订单/i.test(s)) {
    return 'order_form'
  }
  if (/A0101_client_order_service_type|请您选择|选择服务类型/i.test(s)) return 'service_type'
  if (/A0002_client_login|手机号登录/i.test(s)) return 'login'
  if (/A0001_client_welcome|立即进入|欢迎使用/i.test(s)) return 'welcome'
  return 'unknown'
}

async function ensureAgreementChecked(deviceId, xml) {
  const source = xml || (await adb.dumpUi(deviceId))
  if (/我已阅读并同意|I have read/i.test(source) && !/checked="true"[^>]*我已阅读/i.test(source)) {
    await ui.tapByAnyText(deviceId, AGREEMENT_LABELS, source)
    await ui.sleep(400)
  }
}

async function actionLogin(deviceId, phone, password, xml) {
  if (!(await ui.fillInputByLabels(deviceId, PHONE_LABELS, phone, xml))) {
    throw new Error(`Client login: 未找到手机号输入 (${PHONE_LABELS.join(' / ')})`)
  }
  await ui.sleep(300)
  if (!(await ui.fillInputByLabels(deviceId, PASSWORD_LABELS, password))) {
    throw new Error(`Client login: 未找到密码输入 (${PASSWORD_LABELS.join(' / ')})`)
  }
  await ui.sleep(300)
  await ensureAgreementChecked(deviceId, xml)
  await ui.requireTap(deviceId, LOGIN_LABELS, 'Client login: 未找到登录按钮')
  await ui.sleep(3500)
  return 'login'
}

async function actionWelcome(deviceId, xml) {
  await ui.requireTap(deviceId, WELCOME_ENTER_LABELS, 'Client welcome: 未找到「立即进入」', xml)
  await ui.sleep(2000)
  return 'welcome→enter'
}

async function actionServiceType(deviceId, xml) {
  const hit =
    (await ui.tapByAnyText(deviceId, ['接机', '128748', 'Pickup'], xml)) ||
    (await ui.tapByAnyText(deviceId, ['点对点', '128205', 'Point to point', 'Point'], xml))
  if (!hit) throw new Error('Client service_type: 未找到「接机」或「点对点」')
  await ui.sleep(2000)
  return `service_type→${hit}`
}

async function actionPointOrderForm(deviceId, xml, ctx) {
  const hasOriginPostcode = /SW1A 1AA/i.test(xml) && /Westminster|London/i.test(xml)
  const hasOriginStreet = /DemoStreet/i.test(xml)
  const hasDest = /E14 5AB/i.test(xml) && /DestStreet/i.test(xml)
  const hasSchedule = !/请选择时间/.test(xml) && /\d{1,2}:\d{2}/.test(xml)
  const hasVehicle = !/请选择车型/.test(xml)

  if (!ctx.originDone) {
    if (hasOriginPostcode && hasOriginStreet) {
      ctx.originDone = true
      return 'order_form→origin_skip'
    }
    if (hasOriginPostcode && !hasOriginStreet) {
      await ui.clearAndFillInput(deviceId, ['Street / Area', 'Street', 'Area'], 'DemoStreet', xml)
      await ui.clearAndFillInput(deviceId, ['Flat / Door / Note', 'Flat', 'Door'], '1A', xml)
      ctx.originDone = true
      return 'order_form→origin_street'
    }
    if (
      !(await ui.clearAndFillInput(
        deviceId,
        ['Postcode (e.g. SW1A 1AA)', 'Postcode', 'SW1A'],
        'SW1A 1AA',
        xml
      ))
    ) {
      throw new Error('Client order_form: 未找到起点 Postcode')
    }
    await ui.clearAndFillInput(deviceId, ['Street / Area', 'Street', 'Area'], 'DemoStreet', xml)
    await ui.clearAndFillInput(deviceId, ['Flat / Door / Note', 'Flat', 'Door'], '1A', xml)
    ctx.originDone = true
    return 'order_form→origin'
  }

  if (!ctx.destDone) {
    if (hasDest) {
      ctx.destDone = true
      return 'order_form→dest_skip'
    }
    await ui.scrollDown(deviceId)
    const mid = await adb.dumpUi(deviceId)
    if (
      !(await ui.clearAndFillInput(
        deviceId,
        ['Postcode (e.g. E14 5AB)', 'E14', 'Destination Postcode'],
        'E14 5AB',
        mid
      ))
    ) {
      throw new Error('Client order_form: 未找到终点 Postcode')
    }
    await ui.scrollDown(deviceId)
    const fresh = await adb.dumpUi(deviceId)
    await ui.clearAndFillInput(deviceId, ['Street / Area', 'Street'], 'DestStreet', fresh)
    ctx.destDone = true
    return 'order_form→dest'
  }

  if (!ctx.scheduleDone) {
    if (hasSchedule) {
      ctx.scheduleDone = true
      return 'order_form→schedule_skip'
    }
    await ui.scrollDown(deviceId)
    const mid = await adb.dumpUi(deviceId)
    const dateHit = await ui.tapByAnyText(deviceId, ['预约日期'], mid)
    if (dateHit) {
      await ui.sleep(800)
      await ui.confirmNativePicker(deviceId, await adb.dumpUi(deviceId))
      await ui.sleep(500)
    }
    const timeHit = await ui.tapByAnyText(deviceId, ['请选择时间', '预约时间'], await adb.dumpUi(deviceId))
    if (timeHit) {
      await ui.sleep(800)
      await ui.confirmNativePicker(deviceId, await adb.dumpUi(deviceId))
      await ui.sleep(500)
    }
    ctx.scheduleDone = true
    return 'order_form→schedule'
  }

  if (!ctx.vehicleDone) {
    if (hasVehicle) {
      ctx.vehicleDone = true
      return 'order_form→vehicle_skip'
    }
    const vr = await clientMobile.selectVehicleOnOrderForm(deviceId, {
      artifactPrefix: 'client_vehicle_ui'
    })
    if (!vr.ok) {
      throw new Error(`Client order_form 车型: ${vr.reason} (tap=${JSON.stringify(vr.tap)} options=${(vr.options || []).join('|')})`)
    }
    ctx.vehicleDone = true
    return `order_form→vehicle(${vr.selected}@${vr.tap?.x},${vr.tap?.y})`
  }

  ctx.submitAttempts = (ctx.submitAttempts || 0) + 1
  let submitted = null
  for (let i = 0; i < 5; i++) {
    await ui.scrollDown(deviceId)
    const fresh = await adb.dumpUi(deviceId)
    submitted = await ui.tapByAnyText(deviceId, ['下单', '提交订单'], fresh)
    if (submitted) break
  }
  if (!submitted) {
    if (ctx.submitAttempts >= 4) {
      throw new Error('Client order_form: 未找到「下单」按钮（需填完地址/日期/车型并滚动到底部）')
    }
    return 'order_form→submit_retry'
  }
  await ui.sleep(4000)
  const after = await adb.dumpUi(deviceId)
  if (detectClientPage(after) === 'payment') {
    return 'order_form→submit_ok'
  }
  if (ctx.submitAttempts >= 4) {
    throw new Error('Client order_form: 点击下单后未进入付款页')
  }
  return 'order_form→submit_wait'
}

async function actionPickupOrderForm(deviceId, xml, ctx) {
  if (!ctx.originDone) {
    await ui.clearAndFillInput(deviceId, ['航班号', 'Flight'], 'CA123', xml)
    const dateHit = await ui.tapByAnyText(deviceId, ['接机日期', 'Pickup date'], xml)
    if (dateHit) {
      await ui.sleep(800)
      await ui.confirmNativePicker(deviceId, await adb.dumpUi(deviceId))
    }
    const timeHit = await ui.tapByAnyText(deviceId, ['接机时间', 'Pickup time'], xml)
    if (timeHit) {
      await ui.sleep(800)
      await ui.confirmNativePicker(deviceId, await adb.dumpUi(deviceId))
    }
    ctx.originDone = true
    return 'order_form→pickup_schedule'
  }

  if (!ctx.destDone) {
    await ui.clearAndFillInput(
      deviceId,
      ['Postcode (e.g. SW1A 1AA)', 'Postcode', 'SW1A'],
      'SW1A 1AA',
      xml
    )
    await ui.clearAndFillInput(deviceId, ['Street / Area', 'Street'], 'DemoStreet', xml)
    await ui.clearAndFillInput(deviceId, ['电话', 'Phone'], '13800138000', xml)
    ctx.destDone = true
    return 'order_form→pickup_dest'
  }

  if (!ctx.vehicleDone) {
    const vr = await clientMobile.selectVehicleOnOrderForm(deviceId, {
      artifactPrefix: 'client_vehicle_ui'
    })
    if (!vr.ok) {
      throw new Error(`Client pickup 车型: ${vr.reason}`)
    }
    ctx.vehicleDone = true
    return `order_form→pickup_vehicle(${vr.selected})`
  }

  let submitted = null
  for (let i = 0; i < 5; i++) {
    const fresh = i === 0 ? xml : await adb.dumpUi(deviceId)
    submitted = await ui.tapByAnyText(
      deviceId,
      ['提交订单', '下单', 'Submit order', 'Place order', '提交'],
      fresh
    )
    if (submitted) break
    await ui.scrollDown(deviceId)
  }
  if (!submitted) throw new Error('Client order_form: 未找到「提交订单」按钮')
  await ui.sleep(4000)
  return 'order_form→submit'
}

async function actionOrderForm(deviceId, xml, ctx) {
  if (isDatePickerOverlay(xml)) {
    return (await dismissSystemOverlay(deviceId, xml)) || 'order_form→date_picker'
  }

  const page = extractPagePath(xml)
  if (/A0102/i.test(page) || /接机订单/i.test(xml)) {
    return actionPickupOrderForm(deviceId, xml, ctx)
  }
  return actionPointOrderForm(deviceId, xml, ctx)
}

async function actionPayment(deviceId, xml, ctx) {
  if (ctx.paymentSubmitted) return 'payment→done'

  await ui.tapByAnyText(deviceId, [
    '微信支付',
    'WeChat Pay',
    'WeChat',
    '支付宝支付',
    'Alipay',
    'Pay'
  ], xml)
  await ui.sleep(800)
  await ui.fillInputByLabels(deviceId, ['付款人姓名', 'Payer name', 'Name'], 'DemoCustomer')
  await ui.fillInputByLabels(
    deviceId,
    ['付款流水号', 'Transaction', 'Reference', '流水号'],
    `DEMO${Date.now()}`
  )
  await ui.requireTap(deviceId, ['提交付款信息', 'Submit payment', 'Confirm payment'], 'Client payment: 未找到提交按钮')
  ctx.paymentSubmitted = true
  await ui.sleep(3500)
  return 'payment→submit'
}

async function actionOrderHistory(deviceId, xml, ctx) {
  if (ctx.historyChecked) return 'order_history→done'
  await ui.tapByAnyText(deviceId, ['已完成', 'Completed', '历史', 'History'], xml)
  await ui.sleep(2000)
  const after = await adb.dumpUi(deviceId)
  if (/已完成|completed/i.test(after)) {
    ctx.historyChecked = true
    return 'order_history→completed'
  }
  throw new Error('Client order_history: 未找到「已完成」状态')
}

function isLoggedInState(state) {
  return !['login', 'welcome', 'unknown'].includes(state)
}

function goalReached(goal, ctx, state) {
  switch (goal) {
    case 'logged_in':
      return isLoggedInState(state)
    case 'order_submitted':
      return state === 'payment' || state === 'order_history'
    case 'payment_submitted':
      return ctx.paymentSubmitted || state === 'order_history'
    case 'history_completed':
      return ctx.historyChecked
    default:
      return false
  }
}

async function runClientFsm(deviceId, { phone, password, goal }) {
  const ctx = {
    originDone: false,
    destDone: false,
    scheduleDone: false,
    vehicleDone: false,
    submitAttempts: 0,
    paymentSubmitted: false,
    historyChecked: false
  }
  const trace = []
  let unknownStreak = 0

  for (let step = 0; step < MAX_STEPS; step++) {
    const snap = await ui.logKeyNodes(deviceId, `client_fsm_${step}`, 'client')
    const state = detectClientPage(snap.xml)
    const page = extractPagePath(snap.xml) || snap.page
    const entry = { step, state, page, action: null }
    trace.push(entry)
    console.log(`  [client:fsm] step=${step} state=${state} page=${page}`)

    if (goalReached(goal, ctx, state)) {
      return { trace, ctx, finalState: state, page }
    }

    if (state === 'unknown') {
      const overlay = await dismissSystemOverlay(deviceId, snap.xml)
      if (overlay) {
        entry.action = overlay
        unknownStreak = 0
        continue
      }
      unknownStreak++
      entry.action = 'wait'
      if (unknownStreak >= MAX_UNKNOWN) {
        throw new Error(
          `Client 连续 ${MAX_UNKNOWN} 次无法识别页面 (trace: ${JSON.stringify(trace.slice(-MAX_UNKNOWN))})`
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
      case 'welcome':
        action = await actionWelcome(deviceId, snap.xml)
        break
      case 'service_type':
        action = await actionServiceType(deviceId, snap.xml)
        break
      case 'order_form':
        action = await actionOrderForm(deviceId, snap.xml, ctx)
        break
      case 'payment':
        if (goal === 'order_submitted') {
          return { trace, ctx, finalState: state, page }
        }
        action = await actionPayment(deviceId, snap.xml, ctx)
        break
      case 'order_history':
        if (goal === 'history_completed') {
          action = await actionOrderHistory(deviceId, snap.xml, ctx)
        } else if (goal === 'order_submitted' || goal === 'payment_submitted') {
          return { trace, ctx, finalState: state, page }
        } else {
          break
        }
        break
      default:
        action = 'noop'
    }
    entry.action = action
  }

  throw new Error(`Client FSM 超过最大步数 ${MAX_STEPS} (goal=${goal})`)
}

module.exports = {
  MAX_UNKNOWN,
  MAX_STEPS,
  extractPagePath,
  detectClientPage,
  runClientFsm,
  isLoggedInState
}
