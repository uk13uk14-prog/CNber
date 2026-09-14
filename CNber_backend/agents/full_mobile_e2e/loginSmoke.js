#!/usr/bin/env node
/**
 * 三端登录冒烟 — Client / Driver / Admin，不跑完整订单闭环。
 * 用法: E2E_SYNC_FIRST=0 node agents/full_mobile_e2e/loginSmoke.js
 */
require('dotenv').config()

const path = require('path')
const mongoose = require('mongoose')
const { writeAgentReports } = require('../_shared/reportWriter')
const { DEMO_PASSWORD, ACCOUNTS, upsertDemoAccounts } = require('./demoSeed')
const httpApi = require('./httpApi')
const emulator = require('./emulator')
const physicalDevices = require('./physicalDevices')
const lanApi = require('./lanApi')
const apkMode = require('./apkMode')
const appReady = require('./appReady')
const clientMobile = require('./clientMobile')
const driverMobile = require('./driverMobile')
const adminWeb = require('./adminWeb')
const adb = require('../_shared/adb')
const { ensureReportsDir } = require('../_shared/paths')

const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnber'

const report = {
  agent: 'full_mobile_e2e_login_smoke',
  startedAt: new Date().toISOString(),
  finishedAt: null,
  result: 'PENDING',
  devices: { client: null, driver: null },
  adminWebUrl: null,
  pageStates: { client: [], driver: [] },
  steps: [],
  failure: null
}

async function runStep(name, fn) {
  const entry = { name, ok: false, detail: '' }
  report.steps.push(entry)
  try {
    entry.detail = await fn()
    entry.ok = true
    console.log(`  ✓ ${name}${entry.detail ? ` — ${entry.detail}` : ''}`)
    return true
  } catch (err) {
    entry.detail = err.message || String(err)
    report.failure = { step: name, reason: entry.detail }
    console.error(`  ✗ ${name} — ${entry.detail}`)
    return false
  }
}

function finish(result) {
  report.result = result
  report.finishedAt = new Date().toISOString()
  const md = [
    '# CNber 三端登录冒烟',
    '',
    `**结果**: ${result}`,
    `**Client**: ${report.devices.client || '—'}`,
    `**Driver**: ${report.devices.driver || '—'}`,
    report.adminWebUrl ? `**Admin**: ${report.adminWebUrl}` : '',
    report.pageStates?.client?.length
      ? `- **Client FSM**: ${report.pageStates.client.map((t) => t.state).join(' → ')}`
      : '',
    report.pageStates?.driver?.length
      ? `- **Driver FSM**: ${report.pageStates.driver.map((t) => t.state).join(' → ')}`
      : '',
    '',
    ...report.steps.map((s) => `- ${s.ok ? '✓' : '✗'} ${s.name}: ${s.detail || ''}`),
    report.failure ? `\n失败: ${report.failure.step} — ${report.failure.reason}` : ''
  ].join('\n')
  const { jsonPath, mdPath } = writeAgentReports('full_mobile_e2e_login_smoke', report, md)
  console.log(`\nJSON: ${jsonPath}\nMarkdown: ${mdPath}\n>>> ${result}\n`)
}

async function main() {
  console.log('\n=== CNber 三端登录冒烟 ===\n')

  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET 未设置')
    process.exit(1)
  }

  process.env.ADB_PATH =
    process.env.ADB_PATH || path.join(emulator.SDK_ROOT, 'platform-tools', 'adb.exe')

  const launchPlan = apkMode.resolveLaunchPlan(true, apkMode.checkApks())
  report.lan = await lanApi.validatePhysicalEnvironment(launchPlan).catch((err) => {
    throw err
  })
  console.log(`Backend LAN API: ${report.lan.backendLanApi}`)

  await mongoose.connect(mongoUrl)
  let ok = true

  ok = (await runStep('Demo 账号', async () => {
    await upsertDemoAccounts()
    return ACCOUNTS.customer.phone
  })) && ok

  ok = (await runStep('Backend', async () => {
    const info = await httpApi.checkBackendHealth()
    return `${info.host}:${info.port}`
  })) && ok

  ok = (await runStep('识别双真机', async () => {
    const info = await physicalDevices.ensureTwoPhysicalDevices()
    report.devices.client = info.clientDevice
    report.devices.driver = info.driverDevice
    return `${info.clientDevice}, ${info.driverDevice}`
  })) && ok

  const clientDevice = report.devices.client
  const driverDevice = report.devices.driver

  ok = (await runStep('Client App 就绪 (takeover)', async () => {
    const info = await appReady.verifyTakeoverApp({
      deviceId: clientDevice,
      role: 'client',
      label: 'Client',
      captureScreenshot: async (label) => {
        const file = path.join(ensureReportsDir(), 'full_mobile_e2e_screenshots', `login_${label}.png`)
        await adb.screencap(file, clientDevice)
        return file
      }
    })
    return info.log
  })) && ok

  if (ok) {
    ok = (await runStep('Client 登录 (FSM)', async () => {
      const r = await clientMobile.runUntilLoggedIn(
        clientDevice,
        ACCOUNTS.customer.phone,
        DEMO_PASSWORD
      )
      report.pageStates.client = r.trace
      return r.summary
    })) && ok
  }

  if (ok) {
    ok = (await runStep('Driver App 就绪 (takeover)', async () => {
      const info = await appReady.verifyTakeoverApp({
        deviceId: driverDevice,
        role: 'driver',
        label: 'Driver',
        captureScreenshot: async (label) => {
          const file = path.join(ensureReportsDir(), 'full_mobile_e2e_screenshots', `login_${label}.png`)
          await adb.screencap(file, driverDevice)
          return file
        }
      })
      return info.log
    })) && ok
  }

  if (ok) {
    ok = (await runStep('Driver 登录 (FSM)', async () => {
      const r = await driverMobile.runUntilLoggedIn(
        driverDevice,
        ACCOUNTS.driver.phone,
        DEMO_PASSWORD
      )
      report.pageStates.driver = r.trace
      return r.summary
    })) && ok
  }

  ok = (await runStep('Admin Web 端口', async () => {
    report.adminWebUrl = await adminWeb.resolveAdminLoginUrl()
    return report.adminWebUrl
  })) && ok

  ok = (await runStep('Admin 登录', async () => {
    await adminWeb.startAdminWebDevServer()
    const r = await adminWeb.runAdminLoginOnly({
      adminPhone: ACCOUNTS.admin.phone,
      password: DEMO_PASSWORD
    })
    return r.url
  })) && ok

  await mongoose.disconnect()
  await adminWeb.stopAdminWebDevServer()
  finish(ok ? 'PASS' : 'FAIL')
  process.exit(ok ? 0 : 1)
}

main().catch(async (err) => {
  report.failure = { step: 'unexpected', reason: err.message }
  finish('FAIL')
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
