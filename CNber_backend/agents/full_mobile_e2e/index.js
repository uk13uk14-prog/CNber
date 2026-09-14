#!/usr/bin/env node
/**
 * CNber Full Mobile E2E — 双 Android 真机（默认）/ 模拟器 + Admin Web 完整闭环
 *
 * 仅使用 cnber_demo_agent 标记的测试账号，不删除/清空真实数据。
 */
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const { ensureReportsDir } = require('../_shared/paths')
const { writeAgentReports } = require('../_shared/reportWriter')
const adb = require('../_shared/adb')
const { DEMO_TAG, DEMO_PASSWORD, ACCOUNTS, upsertDemoAccounts } = require('./demoSeed')
const httpApi = require('./httpApi')
const emulator = require('./emulator')
const hxb = require('./hxb')
const clientMobile = require('./clientMobile')
const driverMobile = require('./driverMobile')
const adminWeb = require('./adminWeb')
const appReady = require('./appReady')
const apkMode = require('./apkMode')
const physicalDevices = require('./physicalDevices')
const lanApi = require('./lanApi')

const STEP_TIMEOUT_MS = appReady.STEP_WAIT_MS

const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnber'

const report = {
  agent: 'full_mobile_e2e',
  tag: DEMO_TAG,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  result: 'PENDING',
  skipped: false,
  skipReason: null,
  devices: { client: null, driver: null },
  target: null,
  mode: null,
  lan: null,
  deviceInfo: { client: null, driver: null },
  apk: {
    client: null,
    driver: null,
    canContinueE2e: false
  },
  order: null,
  pageStates: { client: [], driver: [] },
  screenshots: [],
  steps: [],
  failure: null
}

let ctx = {
  clientDevice: null,
  driverDevice: null,
  orderId: null,
  orderNo: null,
  tokens: {},
  userIds: {},
  orderStartedAt: null,
  clientPackage: null,
  driverPackage: null
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function mobileShot(deviceId, label) {
  const dir = path.join(ensureReportsDir(), 'full_mobile_e2e_screenshots')
  const file = path.join(dir, `${label}.png`)
  await adb.screencap(file, deviceId)
  report.screenshots.push({ label, path: file, deviceId })
  return file
}

async function runStep(name, fn, options = {}) {
  const timeoutMs = options.timeoutMs ?? STEP_TIMEOUT_MS
  const entry = { name, ok: false, detail: '' }
  report.steps.push(entry)
  try {
    const detail = await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`步骤超时 (${timeoutMs}ms)`)), timeoutMs)
      )
    ])
    entry.ok = true
    entry.detail = typeof detail === 'string' ? detail : detail?.detail || ''
    console.log(`  ✓ ${name}${entry.detail ? ` — ${entry.detail}` : ''}`)
    return true
  } catch (err) {
    entry.ok = false
    entry.detail = err.message || String(err)
    report.failure = { step: name, reason: entry.detail }
    console.error(`  ✗ ${name} — ${entry.detail}`)
    if (options.screenshotDeviceId) {
      try {
        await mobileShot(options.screenshotDeviceId, options.screenshotLabel || 'step_fail')
      } catch {
        /* ignore */
      }
    }
    return false
  }
}

function finish(result, skipReason) {
  report.result = result
  report.skipped = result === 'SKIPPED'
  report.skipReason = skipReason || null
  report.finishedAt = new Date().toISOString()
  const { jsonPath, mdPath } = writeAgentReports('full_mobile_e2e_report', report, buildMarkdown())
  console.log(`\nJSON: ${jsonPath}`)
  console.log(`Markdown: ${mdPath}`)
  console.log(`\n>>> ${result}\n`)
  return result
}

function buildMarkdown() {
  const apkSection = report.apk
    ? [
        '## APK / 启动',
        '',
        `- **当前模式**: ${report.mode || '—'}`,
        report.apk.client
          ? `- **Client APK**: ${report.apk.client.exists ? '存在' : '缺失'} \`${report.apk.client.path || apkMode.CLIENT_APK_REL}\``
          : '',
        report.apk.driver
          ? `- **Driver APK**: ${report.apk.driver.exists ? '存在' : '缺失'} \`${report.apk.driver.path || apkMode.DRIVER_APK_REL}\``
          : '',
        report.apk.client?.installOk !== undefined
          ? `- **Client 安装**: ${report.apk.client.installOk ? '成功' : '失败'}${report.apk.client.installDetail ? ` (${report.apk.client.installDetail})` : ''}`
          : '',
        report.apk.driver?.installOk !== undefined
          ? `- **Driver 安装**: ${report.apk.driver.installOk ? '成功' : '失败'}${report.apk.driver.installDetail ? ` (${report.apk.driver.installDetail})` : ''}`
          : '',
        report.apk.client?.launchOk !== undefined
          ? `- **Client 启动**: ${report.apk.client.launchOk ? '成功' : '未启动'}`
          : '',
        report.apk.driver?.launchOk !== undefined
          ? `- **Driver 启动**: ${report.apk.driver.launchOk ? '成功' : '未启动'}`
          : '',
        report.apk.client?.loginPageOk
          ? `- **Client 登录页**: 已进入${report.apk.client.package ? ` (${report.apk.client.package})` : ''}`
          : report.apk.client?.loginPageOk === false
            ? '- **Client 登录页**: 未进入'
            : '',
        report.apk.driver?.loginPageOk
          ? `- **Driver 登录页**: 已进入${report.apk.driver.package ? ` (${report.apk.driver.package})` : ''}`
          : report.apk.driver?.loginPageOk === false
            ? '- **Driver 登录页**: 未进入'
            : '',
        `- **可继续 E2E**: ${report.apk.canContinueE2e ? '是' : '否'}`,
        ''
      ]
    : []

  return [
    '# CNber Full Mobile E2E 报告',
    '',
    `**结果**: ${report.result}`,
    `**目标**: ${report.target || '—'}`,
    `**模式**: ${report.mode || '—'}`,
    report.lan?.backendLanApi ? `**Backend LAN API**: ${report.lan.backendLanApi}` : '',
    `**标记**: \`${DEMO_TAG}\``,
    report.skipReason ? `**跳过原因**: ${report.skipReason}` : '',
    `**Client 设备**: ${report.devices.client || '—'}`,
    `**Driver 设备**: ${report.devices.driver || '—'}`,
    report.deviceInfo.client
      ? `- Client 检查: boot=${report.deviceInfo.client.bootCompleted} size=${report.deviceInfo.client.wmSize} pkgs=${(report.deviceInfo.client.cnberPackages || []).join(', ') || '—'}`
      : '',
    report.deviceInfo.driver
      ? `- Driver 检查: boot=${report.deviceInfo.driver.bootCompleted} size=${report.deviceInfo.driver.wmSize} pkgs=${(report.deviceInfo.driver.cnberPackages || []).join(', ') || '—'}`
      : '',
    report.pageStates?.client?.length
      ? `- **Client FSM**: ${report.pageStates.client.map((t) => `${t.state}@${t.page || '?'}`).join(' → ')}`
      : '',
    report.pageStates?.driver?.length
      ? `- **Driver FSM**: ${report.pageStates.driver.map((t) => `${t.state}@${t.page || '?'}`).join(' → ')}`
      : '',
    report.adminWebUrl ? `**Admin Web**: ${report.adminWebUrl}` : '',
    '',
    ...apkSection,
    '## 订单',
    '',
    report.order
      ? `- 订单号: **${report.order.orderNo}**`
      : '- 订单: 未创建',
    report.order ? `- 订单 ID: \`${report.order.orderId}\`` : '',
    report.order ? `- 最终状态: **${report.order.finalStatus}**` : '',
    '',
    '## 步骤',
    '',
    ...report.steps.map((s) => `- ${s.ok ? '✓' : '✗'} **${s.name}**${s.detail ? `: ${s.detail}` : ''}`),
    '',
    '## 截图',
    '',
    ...(report.screenshots.length
      ? report.screenshots.map((s) => `- ${s.label}${s.deviceId ? ` (${s.deviceId})` : ''}: \`${s.path}\``)
      : ['（无）']),
    '',
    report.failure
      ? ['## 失败', '', `- 步骤: ${report.failure.step}`, `- 原因: ${report.failure.reason}`, '']
      : []
  ]
    .flat()
    .filter((l) => l !== undefined)
}

function captureFor(deviceId, prefix) {
  return async (label) => {
    const file = await mobileShot(deviceId, `${prefix}_${label}`)
    return file
  }
}

async function bootstrapRole({
  deviceId,
  role,
  label,
  prefix,
  launchMode,
  apkPath,
  projectName
}) {
  if (launchMode === 'apk') {
    const r = await apkMode.installLaunchAndVerify({
      deviceId,
      apkPath,
      role,
      label,
      captureScreenshot: captureFor(deviceId, prefix)
    })
    return { package: r.package, launchMode: 'apk', detail: r.detail, apkResult: r }
  }
  if (launchMode === 'takeover') {
    const info = await appReady.verifyTakeoverApp({
      deviceId,
      role,
      label,
      captureScreenshot: captureFor(deviceId, prefix)
    })
    return {
      package: info.package,
      launchMode: 'takeover',
      detail: info.log,
      takeoverResult: info
    }
  }
  process.env.E2E_ALLOW_HBUILDER = '1'
  const info = await hxb.syncAndVerifyApp({
    deviceId,
    role,
    projectName,
    label,
    captureScreenshot: captureFor(deviceId, prefix)
  })
  return { package: info.package, launchMode: 'sync', detail: info.log, syncResult: info }
}

async function main() {
  console.log('\n=== CNber Full Mobile E2E ===\n')
  console.log(`标记: ${DEMO_TAG}\n`)

  if (!process.env.JWT_SECRET) {
    finish('FAIL')
    console.error('❌ JWT_SECRET 未设置')
    process.exit(1)
  }

  const isPhysical = apkMode.isPhysicalTarget()
  report.target = isPhysical ? 'physical' : 'emulator'

  process.env.ADB_PATH =
    process.env.ADB_PATH || path.join(emulator.SDK_ROOT, 'platform-tools', 'adb.exe')
  process.env.PATH = [
    path.join(emulator.SDK_ROOT, 'platform-tools'),
    path.join(emulator.SDK_ROOT, 'emulator'),
    process.env.PATH
  ]
    .filter(Boolean)
    .join(path.delimiter)

  const apkCheck = apkMode.checkApks()
  report.apk.client = {
    path: apkCheck.paths.client,
    rel: apkCheck.paths.clientRel,
    exists: apkCheck.clientExists
  }
  report.apk.driver = {
    path: apkCheck.paths.driver,
    rel: apkCheck.paths.driverRel,
    exists: apkCheck.driverExists
  }

  const launchPlan = apkMode.resolveLaunchPlan(isPhysical, apkCheck)
  report.mode = apkMode.getModeLabel(isPhysical, launchPlan)
  console.log(`目标: ${report.target}`)
  console.log(`模式: ${report.mode}\n`)

  if (!isPhysical && launchPlan.requireAllApks && !apkCheck.allPresent) {
    const msg = apkMode.buildMissingApkMessage(apkCheck)
    console.error(`\n${msg}\n`)
    report.apk.canContinueE2e = false
    report.failure = { step: 'APK 检测', reason: msg }
    finish('FAIL')
    process.exit(1)
  }

  if (isPhysical) {
    try {
      report.lan = await lanApi.validatePhysicalEnvironment(launchPlan)
      console.log(`Backend LAN API: ${report.lan.backendLanApi}`)
      if (report.lan.envIssues?.length) {
        console.log(`App .env 将写入: ${report.lan.backendLanApi}`)
      }
      if (report.lan.firewall?.hint) console.log(`防火墙: ${report.lan.firewall.hint}`)
      const needsEnvWrite =
        launchPlan.client === 'sync' || launchPlan.driver === 'sync'
      if (needsEnvWrite) {
        hxb.prepareMobileApiEnv(report.lan.backendLanApi)
      } else if (launchPlan.client === 'takeover' && launchPlan.driver === 'takeover') {
        console.log('接管模式: 跳过 HBuilderX CLI 与 .env 写入')
      }
    } catch (err) {
      report.failure = { step: '真机 API/网络检查', reason: err.message }
      finish('FAIL')
      console.error(`\n❌ ${err.message}\n`)
      process.exit(1)
    }
  } else if (apkMode.isHbuilderFallbackMode()) {
    hxb.prepareMobileApiEnv(hxb.resolveApiBaseUrl())
  }

  await mongoose.connect(mongoUrl)

  let ok = true

  ok = (await runStep('创建/更新 Demo 测试账号', async () => {
    const seeded = await upsertDemoAccounts()
    ctx.userIds = seeded.userIds
    return 'customer / driver / admin + 收款账户'
  })) && ok
  if (!ok) {
    await mongoose.disconnect()
    finish('FAIL')
    process.exit(1)
  }

  ok = (await runStep('检查 Backend 是否启动', async () => {
    const info = await httpApi.checkBackendHealth()
    return `${info.host}:${info.port}`
  })) && ok
  if (!ok) {
    await mongoose.disconnect()
    finish('FAIL')
    process.exit(1)
  }

  if (isPhysical) {
    ok = (await runStep('识别双 Android 真机 (adb devices)', async () => {
      const all = await physicalDevices.listAllDevices()
      const info = await physicalDevices.ensureTwoPhysicalDevices()
      ctx.clientDevice = info.clientDevice
      ctx.driverDevice = info.driverDevice
      report.devices.client = info.clientDevice
      report.devices.driver = info.driverDevice
      report.deviceInfo.client = info.clientInfo
      report.deviceInfo.driver = info.driverInfo
      return `all=[${all.map((d) => d.id).join(', ')}] client=${info.clientDevice} driver=${info.driverDevice} (${info.source})`
    })) && ok
  } else {
    ok = (await runStep('启动双 Android 模拟器', async () => {
      const info = await emulator.ensureTwoEmulators()
      ctx.clientDevice = info.clientDevice
      ctx.driverDevice = info.driverDevice
      report.devices.client = info.clientDevice
      report.devices.driver = info.driverDevice
      return `${info.clientDevice}, ${info.driverDevice}`
    })) && ok
  }
  if (!ok) {
    await mongoose.disconnect()
    finish('FAIL')
    process.exit(1)
  }

  const clientApk = apkCheck.paths.client
  const driverApk = apkCheck.paths.driver

  ok = (await runStep(
    `Client App 就绪 (${launchPlan.client}) — ${ctx.clientDevice}`,
    async () => {
      const r = await bootstrapRole({
        deviceId: ctx.clientDevice,
        role: 'client',
        label: 'Client',
        prefix: '01',
        launchMode: launchPlan.client,
        apkPath: clientApk,
        projectName: 'CNber_client_admin_v1.0'
      })
      ctx.clientPackage = r.package
      Object.assign(report.apk.client, r.apkResult || r.syncResult || r.takeoverResult || {}, {
        launchMode: r.launchMode,
        loginPageOk: true,
        launchOk: true
      })
      return `${r.launchMode} | ${r.package} | ${r.detail}`
    },
    { screenshotDeviceId: ctx.clientDevice, screenshotLabel: '01_client_not_ready' }
  )) && ok

  ok = (await runStep(
    `Driver App 就绪 (${launchPlan.driver}) — ${ctx.driverDevice}`,
    async () => {
      const r = await bootstrapRole({
        deviceId: ctx.driverDevice,
        role: 'driver',
        label: 'Driver',
        prefix: '02',
        launchMode: launchPlan.driver,
        apkPath: driverApk,
        projectName: 'CNber_driver_admin_v1.0'
      })
      ctx.driverPackage = r.package
      Object.assign(report.apk.driver, r.apkResult || r.syncResult || r.takeoverResult || {}, {
        launchMode: r.launchMode,
        loginPageOk: true,
        launchOk: true
      })
      return `${r.launchMode} | ${r.package} | ${r.detail}`
    },
    { screenshotDeviceId: ctx.driverDevice, screenshotLabel: '02_driver_not_ready' }
  )) && ok

  report.apk.canContinueE2e = ok
  if (!ok) {
    await mongoose.disconnect()
    finish('FAIL')
    process.exit(1)
  }

  const clientReadyOpts =
    launchPlan.client === 'apk'
      ? { apkMode: true, expectedPackage: ctx.clientPackage }
      : launchPlan.client === 'takeover'
        ? { takeoverOnly: true, expectedPackage: ctx.clientPackage }
        : { allowHbuilderSync: true, apkMode: false, expectedPackage: ctx.clientPackage }
  const driverReadyOpts =
    launchPlan.driver === 'apk'
      ? { apkMode: true, expectedPackage: ctx.driverPackage }
      : launchPlan.driver === 'takeover'
        ? { takeoverOnly: true, expectedPackage: ctx.driverPackage }
        : { allowHbuilderSync: true, apkMode: false, expectedPackage: ctx.driverPackage }

  ok = (await runStep('检测 Admin Web 端口 (5173–5180)', async () => {
    const url = await adminWeb.resolveAdminLoginUrl()
    report.adminWebUrl = url
    return url
  })) && ok

  ok = (await runStep('启动 Admin Web (Playwright)', async () => {
    const info = await adminWeb.startAdminWebDevServer()
    return info.url || (info.started ? 'started vite dev' : 'already running')
  })) && ok

  if (process.env.E2E_LOGIN_ONLY === '1') {
    ok = (await runStep('Client 登录 (FSM)', async () => {
      const r = await clientMobile.runUntilLoggedIn(
        ctx.clientDevice,
        ACCOUNTS.customer.phone,
        DEMO_PASSWORD
      )
      report.pageStates.client = r.trace
      return r.summary
    }, { screenshotDeviceId: ctx.clientDevice, screenshotLabel: '03_client_login_fail' })) && ok

    ok = (await runStep('Driver 登录 (FSM)', async () => {
      const r = await driverMobile.runUntilLoggedIn(
        ctx.driverDevice,
        ACCOUNTS.driver.phone,
        DEMO_PASSWORD
      )
      report.pageStates.driver = r.trace
      return r.summary
    }, { screenshotDeviceId: ctx.driverDevice, screenshotLabel: '07_driver_login_fail' })) && ok

    ok = (await runStep('Admin 登录', async () => {
      const r = await adminWeb.runAdminLoginOnly({
        adminPhone: ACCOUNTS.admin.phone,
        password: DEMO_PASSWORD
      })
      report.screenshots.push(...r.screenshots)
      return r.url
    })) && ok

    await mongoose.disconnect()
    await adminWeb.stopAdminWebDevServer()
    hxb.restoreEnvFiles()
    finish(ok ? 'PASS' : 'FAIL')
    process.exit(ok ? 0 : 1)
  }

  ctx.orderStartedAt = Date.now()
  ctx.tokens.customer = await httpApi.login(ACCOUNTS.customer.phone, DEMO_PASSWORD)
  ctx.tokens.admin = await httpApi.login(ACCOUNTS.admin.phone, DEMO_PASSWORD)
  ctx.tokens.driver = await httpApi.login(ACCOUNTS.driver.phone, DEMO_PASSWORD)

  ok = (await runStep(
    'Client 创建订单 (FSM)',
    async () => {
      await appReady.ensureAppReady({
        deviceId: ctx.clientDevice,
        role: 'client',
        label: 'Client',
        captureScreenshot: captureFor(ctx.clientDevice, '03'),
        expectedPackage: ctx.clientPackage,
        ...clientReadyOpts
      })
      const r = await clientMobile.runUntilOrderSubmitted(
        ctx.clientDevice,
        ACCOUNTS.customer.phone,
        DEMO_PASSWORD
      )
      report.pageStates.client = r.trace
      await mobileShot(ctx.clientDevice, '05_client_order_submitted')
      return `${r.finalState} | ${r.summary}`
    },
    { screenshotDeviceId: ctx.clientDevice, screenshotLabel: '03_client_fsm_fail', timeoutMs: 120000 }
  )) && ok

  if (ok) {
    ok = (await runStep('Client 提交定金 (FSM)', async () => {
    const r = await clientMobile.runUntilPaymentSubmitted(
      ctx.clientDevice,
      ACCOUNTS.customer.phone,
      DEMO_PASSWORD
    )
    report.pageStates.client = report.pageStates.client.concat(r.trace)
    await mobileShot(ctx.clientDevice, '06_client_deposit_submitted')
    return r.summary
    })) && ok
  }

  if (ok) {
    ok = (await runStep('解析 Client 新建订单', async () => {
    await sleep(3000)
    const order = await httpApi.fetchLatestCustomerOrder(ctx.tokens.customer, {
      afterMs: ctx.orderStartedAt
    })
    if (!order?._id) throw new Error('未找到新建订单')
    ctx.orderId = String(order._id)
    ctx.orderNo = order.orderNo
    report.order = { orderId: ctx.orderId, orderNo: ctx.orderNo, finalStatus: order.status }
    return ctx.orderNo || ctx.orderId
    })) && ok
  }

  if (ok) {
    ok = (await runStep('Admin Web 确认付款并派单', async () => {
    const result = await adminWeb.runAdminFlow({
      adminPhone: ACCOUNTS.admin.phone,
      customerPhone: ACCOUNTS.customer.phone,
      password: DEMO_PASSWORD,
      orderId: ctx.orderId
    })
    report.screenshots.push(...result.screenshots)
    return `order=${ctx.orderNo || ctx.orderId}`
    })) && ok
  }

  if (ok) {
    ok = (await runStep(
    'Driver 接单 (FSM)',
    async () => {
      await appReady.ensureAppReady({
        deviceId: ctx.driverDevice,
        role: 'driver',
        label: 'Driver',
        captureScreenshot: captureFor(ctx.driverDevice, '07'),
        expectedPackage: ctx.driverPackage,
        ...driverReadyOpts
      })
      const r = await driverMobile.runUntilOrderAccepted(
        ctx.driverDevice,
        ACCOUNTS.driver.phone,
        DEMO_PASSWORD
      )
      report.pageStates.driver = r.trace
      await mobileShot(ctx.driverDevice, '09_driver_accepted')
      return r.summary
    },
    { screenshotDeviceId: ctx.driverDevice, screenshotLabel: '07_driver_fsm_fail', timeoutMs: 120000 }
  )) && ok
  }

  if (ok) {
    ok = (await runStep('Admin 发起尾款 + Client 提交尾款 (API)', async () => {
    await httpApi.httpReq(
      'POST',
      `/api/admin/orders/${ctx.orderId}/balance/request`,
      {},
      ctx.tokens.admin
    )
    const paymentAccountId = await httpApi.getPaymentAccountId()
    await httpApi.submitBalanceViaApi(
      ctx.orderId,
      ctx.tokens.customer,
      paymentAccountId,
      ctx.orderNo,
      DEMO_TAG
    )
    return 'balance submitted'
    })) && ok
  }

  if (ok) {
    ok = (await runStep('Admin Web 确认尾款并推进待出发', async () => {
    const result = await adminWeb.runAdminBalanceConfirm({
      adminPhone: ACCOUNTS.admin.phone,
      password: DEMO_PASSWORD,
      orderId: ctx.orderId
    })
    report.screenshots.push(...result.screenshots)
    await httpApi.adminAdvanceAfterBalance(ctx.orderId, ctx.tokens.admin, DEMO_TAG)
    return 'ready_to_start'
    })) && ok
  }

  if (ok) {
    ok = (await runStep('Driver 开始行程并完成 (FSM)', async () => {
    const startR = await driverMobile.runUntilTripStarted(
      ctx.driverDevice,
      ACCOUNTS.driver.phone,
      DEMO_PASSWORD
    )
    report.pageStates.driver = report.pageStates.driver.concat(startR.trace)
    await mobileShot(ctx.driverDevice, '10_driver_started')
    const doneR = await driverMobile.runUntilTripCompleted(
      ctx.driverDevice,
      ACCOUNTS.driver.phone,
      DEMO_PASSWORD
    )
    report.pageStates.driver = report.pageStates.driver.concat(doneR.trace)
    await mobileShot(ctx.driverDevice, '11_driver_completed')
    return doneR.summary
    })) && ok
  }

  if (ok) {
    ok = (await runStep('Client 查看订单已完成 (FSM)', async () => {
    const pkg = ctx.clientPackage || (await appReady.discoverClientPackage(ctx.clientDevice))
    if (pkg) await adb.launchPackage(pkg, ctx.clientDevice)
    const r = await clientMobile.runUntilCompletedInHistory(
      ctx.clientDevice,
      ACCOUNTS.customer.phone,
      DEMO_PASSWORD
    )
    report.pageStates.client = report.pageStates.client.concat(r.trace)
    await mobileShot(ctx.clientDevice, '12_client_completed')
    const order = await httpApi.verifyOrderCompleted(ctx.orderId, ctx.tokens.customer, DEMO_TAG)
    report.order = {
      orderId: ctx.orderId,
      orderNo: order.orderNo || ctx.orderNo,
      finalStatus: order.status
    }
    return r.summary
    })) && ok
  }

  await mongoose.disconnect()
  await adminWeb.stopAdminWebDevServer()
  hxb.restoreEnvFiles()

  finish(ok ? 'PASS' : 'FAIL')
  process.exit(ok ? 0 : 1)
}

main().catch(async (err) => {
  report.result = 'FAIL'
  report.failure = { step: 'unexpected', reason: err.message || String(err) }
  report.finishedAt = new Date().toISOString()
  try {
    writeAgentReports('full_mobile_e2e_report', report, buildMarkdown())
  } catch {
    /* ignore */
  }
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  await adminWeb.stopAdminWebDevServer().catch(() => {})
  hxb.restoreEnvFiles()
  console.error(`\n❌ Full Mobile E2E 失败: ${err.message}\n`)
  process.exit(1)
})
