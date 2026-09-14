#!/usr/bin/env node
/**
 * CNber Mobile Demo Agent — Android 手机端验收（ADB）
 */
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { BACKEND_ROOT, ensureReportsDir } = require('../_shared/paths')
const { writeAgentReports } = require('../_shared/reportWriter')
const adb = require('../_shared/adb')

const DEMO_PHONE =
  process.env.MOBILE_AGENT_PHONE || 'cnber_demo_agent_customer@cnber.local'
const DEMO_PASSWORD =
  process.env.MOBILE_AGENT_PASSWORD || process.env.DEMO_AGENT_PASSWORD || 'CnberDemo_cnber_demo_agent_dev'

const report = {
  agent: 'mobile_demo_agent',
  startedAt: new Date().toISOString(),
  finishedAt: null,
  result: 'PENDING',
  skipped: false,
  skipReason: null,
  device: null,
  packageName: null,
  screenshots: [],
  steps: [],
  apkPath: null
}

function resolveApkPath() {
  const candidates = [
    process.env.MOBILE_AGENT_APK,
    path.join(BACKEND_ROOT, 'runtime', 'apk', 'cnber_client.apk'),
    path.join(BACKEND_ROOT, 'runtime', 'apk', 'client.apk')
  ].filter(Boolean)
  return candidates.find((p) => fs.existsSync(p)) || null
}

function skipWithReason(reason) {
  report.skipped = true
  report.skipReason = reason
  report.result = 'SKIPPED'
  report.finishedAt = new Date().toISOString()
  console.log('Skipped:')
  console.log(reason)
  const { jsonPath, mdPath } = writeAgentReports('mobile_demo_report', report, buildMarkdown())
  console.log(`\nJSON: ${jsonPath}`)
  console.log(`Markdown: ${mdPath}`)
  console.log('\n>>> SKIPPED\n')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function runStep(name, fn) {
  const entry = { name, ok: false, detail: '' }
  report.steps.push(entry)
  try {
    const detail = await fn()
    entry.ok = true
    entry.detail = detail || ''
    console.log(`  ✓ ${name}${entry.detail ? ` — ${entry.detail}` : ''}`)
    return true
  } catch (err) {
    entry.ok = false
    entry.detail = err.message || String(err)
    console.error(`  ✗ ${name} — ${entry.detail}`)
    return false
  }
}

async function shot(deviceId, label) {
  const dir = path.join(ensureReportsDir(), 'mobile_screenshots')
  const file = path.join(dir, `${label}.png`)
  await adb.screencap(file, deviceId)
  report.screenshots.push({ label, path: file })
  return file
}

async function tryLogin(deviceId) {
  await sleep(2000)
  await shot(deviceId, '01_app_launch')

  await adb.tapByText('请输入手机号', deviceId)
  await sleep(300)
  await adb.inputText(DEMO_PHONE, deviceId)
  await sleep(500)

  await adb.tapByText('请输入密码', deviceId)
  await sleep(300)
  await adb.inputText(DEMO_PASSWORD, deviceId)
  await sleep(500)

  await adb.tapByText('我已阅读并同意', deviceId)
  await sleep(300)

  const tappedLogin = await adb.tapByText('登录', deviceId)
  if (!tappedLogin) {
    throw new Error('未找到登录按钮')
  }
  await sleep(3000)
  await shot(deviceId, '02_after_login')
}

async function tryCreateOrder(deviceId) {
  await adb.tapByText('接机', deviceId) || (await adb.tapByText('预约', deviceId))
  await sleep(2000)
  await shot(deviceId, '03_order_form')

  await adb.tapByText('航班号', deviceId)
  await sleep(200)
  await adb.inputText('CA123', deviceId)

  await adb.tapByText('Postcode', deviceId)
  await sleep(200)
  await adb.inputText('SW1A1AA', deviceId)

  await adb.tapByText('Street', deviceId)
  await sleep(200)
  await adb.inputText('DemoStreet', deviceId)

  await adb.tapByText('电话', deviceId)
  await sleep(200)
  await adb.inputText('13800138000', deviceId)

  const submitted =
    (await adb.tapByText('提交', deviceId)) ||
    (await adb.tapByText('确认', deviceId)) ||
    (await adb.tapByText('下一步', deviceId))

  if (!submitted) {
    throw new Error('未找到提交/确认按钮')
  }

  await sleep(3000)
  await shot(deviceId, '04_after_submit')
}

async function tryViewOrderDetail(deviceId) {
  await adb.tapByText('订单', deviceId) || (await adb.tapByText('历史', deviceId))
  await sleep(2000)
  await shot(deviceId, '05_order_list')

  await adb.tapByText('CNBER', deviceId) || (await adb.tapByText('Demo', deviceId))
  await sleep(2000)
  await shot(deviceId, '06_order_detail')
}

function buildMarkdown() {
  const lines = [
    '# CNber Mobile Demo Agent 报告',
    '',
    `**结果**: ${report.result}`,
    `**跳过**: ${report.skipped ? '是' : '否'}`,
    report.skipReason ? `**原因**: ${report.skipReason}` : '',
    `**设备**: ${report.device?.id || '—'} (${report.device?.state || '—'})`,
    `**包名**: ${report.packageName || '—'}`,
    '',
    '## 步骤',
    '',
    ...report.steps.map((s) => `- ${s.ok ? '✓' : '✗'} **${s.name}**${s.detail ? `: ${s.detail}` : ''}`),
    '',
    '## 截图',
    '',
    ...(report.screenshots.length
      ? report.screenshots.map((s) => `- ${s.label}: \`${s.path}\``)
      : ['（无）']),
    ''
  ]
  return lines
}

async function main() {
  console.log('\n=== CNber Mobile Demo Agent ===\n')

  const devices = await adb.listAndroidDevices()
  if (!devices.length) {
    skipWithReason('No Android device detected.')
    return
  }

  const deviceId = devices[0].id
  report.device = devices[0]

  let pkg = await adb.discoverClientPackage(deviceId)
  const apkPath = resolveApkPath()
  if (!pkg && apkPath) {
    report.apkPath = apkPath
    await runStep('安装 Client APK', async () => {
      await adb.installApk(apkPath, deviceId)
      return path.basename(apkPath)
    })
    pkg = await adb.discoverClientPackage(deviceId)
  }

  if (!pkg) {
    skipWithReason(
      apkPath
        ? 'Client App package not found after APK install. Set MOBILE_AGENT_PACKAGE.'
        : 'No Client App installed. Place APK at runtime/apk/cnber_client.apk or set MOBILE_AGENT_APK.'
    )
    return
  }
  report.packageName = pkg

  let allOk = true
  allOk = (await runStep('启动 App', async () => {
    await adb.launchPackage(pkg, deviceId)
    return pkg
  })) && allOk

  allOk = (await runStep('登录测试账号', async () => {
    await tryLogin(deviceId)
    return DEMO_PHONE
  })) && allOk

  allOk = (await runStep('创建并提交预约订单', async () => {
    await tryCreateOrder(deviceId)
    return 'submitted'
  })) && allOk

  allOk = (await runStep('查看订单详情', async () => {
    await tryViewOrderDetail(deviceId)
    return 'screenshot saved'
  })) && allOk

  report.result = allOk ? 'PASS' : 'FAIL'
  report.finishedAt = new Date().toISOString()

  const { jsonPath, mdPath } = writeAgentReports('mobile_demo_report', report, buildMarkdown())
  console.log(`\nJSON: ${jsonPath}`)
  console.log(`Markdown: ${mdPath}`)
  console.log(`\n>>> ${report.result}\n`)

  if (!allOk) process.exit(1)
}

main().catch((err) => {
  report.result = 'FAIL'
  report.finishedAt = new Date().toISOString()
  report.failure = err.message
  try {
    writeAgentReports('mobile_demo_report', report, buildMarkdown())
  } catch {
    /* ignore */
  }
  console.error(`\n❌ Mobile Demo Agent 失败: ${err.message}\n`)
  process.exit(1)
})
