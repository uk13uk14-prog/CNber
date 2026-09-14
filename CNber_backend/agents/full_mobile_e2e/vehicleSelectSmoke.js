#!/usr/bin/env node
/**
 * 单步：Client → 点对点 → 车型选择（最多 3 次，失败即停）
 */
require('dotenv').config()

const path = require('path')
const { writeAgentReports } = require('../_shared/reportWriter')
const physicalDevices = require('./physicalDevices')
const clientMobile = require('./clientMobile')

const report = {
  agent: 'client_point_vehicle_smoke',
  result: 'PENDING',
  sourceFlow: null,
  selection: null,
  failure: null
}

async function main() {
  console.log('\n=== Client → 点对点 → 车型选择 ===\n')

  process.env.ADB_PATH =
    process.env.ADB_PATH ||
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe')

  const info = await physicalDevices.ensureTwoPhysicalDevices()
  const deviceId = process.env.CLIENT_DEVICE || info.clientDevice

  const r = await clientMobile.selectVehicleOnOrderForm(deviceId, {
    profile: 'point',
    artifactPrefix: 'client_vehicle_ui'
  })

  report.selection = r
  report.sourceFlow = r.sourceFlow
  report.result = r.ok ? 'PASS' : 'FAIL'
  if (!r.ok) report.failure = { reason: r.reason, attempts: r.attempts?.length }

  console.log('使用逻辑:', r.sourceFlow)
  console.log('Profile:', r.profile)
  console.log('成功:', r.ok)
  if (r.tap) {
    console.log('点击车型:', {
      text: r.tap.text,
      bounds: r.tap.bounds,
      x: r.tap.x,
      y: r.tap.y,
      via: r.tap.via
    })
  }
  if (r.confirm) console.log('点击完成:', r.confirm)
  if (r.selected) console.log('选中:', r.selected)
  if (r.nextStep) console.log('下一步:', r.nextStep)
  if (r.artifacts) {
    console.log('XML:', r.artifacts.xml)
    console.log('PNG:', r.artifacts.png)
  }
  if (!r.ok) console.log('失败:', r.reason)
  if (r.hint) console.log('诊断:', r.hint)

  const md = [
    '# Client 点对点车型选择',
    '',
    `**结果**: ${report.result}`,
    `**复用逻辑**: ${r.sourceFlow || '—'}`,
    `**Profile**: ${r.profile || 'point'}`,
    '',
    r.tap
      ? `**点击**: \`${r.tap.text}\` bounds=${r.tap.bounds} center=(${r.tap.x},${r.tap.y}) via=${r.tap.via}`
      : '',
    r.confirm ? `**完成按钮**: (${r.confirm.x}, ${r.confirm.y})` : '',
    r.selected ? `**选中车型**: ${r.selected}` : '',
    r.nextStep ? `**下一步**: ${r.nextStep}` : '',
    '',
    '**产物**',
    '- `runtime/reports/client_vehicle_ui.xml`',
    '- `runtime/reports/client_vehicle_ui.png`',
    `- 每次尝试: client_vehicle_ui_attempt_1..${clientMobile.MAX_RETRIES}.xml/png`,
    !r.ok ? `\n**失败**: ${r.reason}` : ''
  ]
    .filter(Boolean)
    .join('\n')

  const { jsonPath, mdPath } = writeAgentReports('client_point_vehicle_smoke', report, md)
  console.log(`\nJSON: ${jsonPath}\nMarkdown: ${mdPath}\n>>> ${report.result}\n`)
  process.exit(r.ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
