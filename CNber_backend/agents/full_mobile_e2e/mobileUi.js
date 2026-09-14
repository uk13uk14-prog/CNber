/**
 * uni-app WebView UI 辅助：多语言 label、EditText 定位、关键节点日志。
 */
const fs = require('fs')
const path = require('path')
const adb = require('../_shared/adb')
const { ensureReportsDir } = require('../_shared/paths')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractKeyNodes(xml) {
  const nodes = []
  const re =
    /text="([^"]*)"[^>]*(?:content-desc="([^"]*)")?[^>]*(?:hint="([^"]*)")?[^>]*(?:resource-id="([^"]*)")?[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/g
  let m
  while ((m = re.exec(String(xml || '')))) {
    const text = m[1]?.trim()
    const desc = m[2]?.trim()
    const hint = m[3]?.trim()
    const rid = m[4]?.trim()
    if (text || desc || hint) {
      nodes.push({ text, contentDesc: desc, hint, resourceId: rid, bounds: m[5] })
    }
  }
  return nodes.slice(0, 80)
}

async function dumpUiArtifacts(deviceId, prefix) {
  const dir = ensureReportsDir()
  const xmlPath = path.join(dir, `${prefix}_ui.xml`)
  const pngPath = path.join(dir, `${prefix}_ui.png`)
  const xml = await adb.dumpUi(deviceId)
  fs.writeFileSync(xmlPath, xml, 'utf8')
  await adb.screencap(pngPath, deviceId)
  return { xml, xmlPath, pngPath }
}

async function logKeyNodes(deviceId, action, prefix) {
  const { xml, xmlPath, pngPath } = await dumpUiArtifacts(deviceId, prefix || action)
  const pageMatch = xml.match(/text="(pages\/[^"]+)"/)
  const keys = extractKeyNodes(xml)
    .filter((n) => n.text || n.contentDesc)
    .slice(0, 25)
    .map((n) => {
      const parts = []
      if (n.text) parts.push(`text=${n.text.slice(0, 40)}`)
      if (n.contentDesc) parts.push(`desc=${n.contentDesc.slice(0, 30)}`)
      return parts.join(' ')
    })
  console.log(`  [ui:${action}] page=${pageMatch?.[1] || '—'} xml=${xmlPath} png=${pngPath}`)
  if (keys.length) console.log(`  [ui:${action}] nodes: ${keys.join(' | ')}`)
  return { xml, xmlPath, pngPath, page: pageMatch?.[1] || '' }
}

function findEditTextAfterLabel(xml, labels) {
  for (const label of labels) {
    const labelRe = new RegExp(
      `text="[^"]*${escapeRegExp(label)}[^"]*"[^>]*bounds="(\\[[^"]+\\])"`,
      'i'
    )
    const lm = String(xml || '').match(labelRe)
    if (!lm) continue
    const idx = xml.indexOf(lm[0])
    const slice = xml.slice(idx, idx + 2000)
    const em = slice.match(/class="android\.widget\.EditText"[^>]*bounds="(\[[^"]+\])"/i)
    if (em) {
      return adb.parseBounds ? adb.parseBounds(em[1]) : parseBoundsInline(em[1])
    }
    return parseBoundsInline(lm[1])
  }
  return null
}

function parseBoundsInline(boundsStr) {
  const m = String(boundsStr || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/)
  if (!m) return null
  return {
    x: Math.round((Number(m[1]) + Number(m[3])) / 2),
    y: Math.round((Number(m[2]) + Number(m[4])) / 2)
  }
}

async function tapByAnyText(deviceId, labels, xml) {
  const source = xml || (await adb.dumpUi(deviceId))
  for (const label of labels) {
    const node =
      adb.findNodeByText(source, label, { partial: true }) ||
      adb.findNodeByContentDesc(source, label, { partial: true })
    if (node) {
      await adb.tap(node.x, node.y, deviceId)
      return label
    }
  }
  return null
}

async function tapInputByLabels(deviceId, labels, xml) {
  const source = xml || (await adb.dumpUi(deviceId))
  const node = findEditTextAfterLabel(source, labels)
  if (node) {
    await adb.tap(node.x, node.y, deviceId)
    return labels[0]
  }
  const hit = await tapByAnyText(deviceId, labels, source)
  return hit
}

async function clearFocusedInput(deviceId, chars = 24) {
  await adb.pressKey('KEYCODE_MOVE_END', deviceId).catch(() => {})
  for (let i = 0; i < chars; i++) {
    await adb.pressKey('67', deviceId)
  }
}

async function clearAndFillInput(deviceId, labels, value, xml) {
  const hit = await tapInputByLabels(deviceId, labels, xml)
  if (!hit) return false
  await sleep(250)
  await clearFocusedInput(deviceId)
  await sleep(100)
  await adb.inputText(value, deviceId)
  await sleep(400)
  return true
}

async function confirmNativePicker(deviceId, xml) {
  const fresh = xml || (await adb.dumpUi(deviceId))
  const done =
    adb.findNodeByContentDesc(fresh, '完成', { partial: false }) ||
    adb.findNodeByText(fresh, '完成', { partial: false })
  if (done) {
    await adb.tap(done.x, done.y, deviceId)
    await sleep(500)
    return { ...done, label: '完成' }
  }
  return (
    (await tapByAnyText(deviceId, ['确定', 'OK', 'Confirm', 'Done'], fresh)) ||
    (await tapByAnyText(deviceId, ['取消', 'Cancel'], fresh))
  )
}

async function scrollDown(deviceId) {
  await adb.scrollDown(deviceId)
  await sleep(500)
}

async function fillInputByLabels(deviceId, labels, value, xml) {
  return clearAndFillInput(deviceId, labels, value, xml)
}

async function requireTap(deviceId, labels, errMsg, xml) {
  const hit = await tapByAnyText(deviceId, labels, xml)
  if (!hit) throw new Error(errMsg || `未找到可点击项: ${labels.join(' / ')}`)
  return hit
}

function isLoggedInClient(xml) {
  if (/pages\/A0002_client_login|手机号登录/i.test(xml)) return false
  return /pages\/A0300_client_main|pages\/A0301_|个人中心|退出登录|我的订单/i.test(xml)
}

function isLoggedInDriver(xml) {
  return (
    /pages\/D0300_driver_main|司机首页|工作台|可接单|我的任务/i.test(xml) &&
    !/pages\/D0002_driver_login|司机登录/i.test(xml)
  )
}

function isOnClientLogin(xml) {
  return /pages\/A0002_client_login|手机号登录|请输入手机号/i.test(xml)
}

function isOnDriverLogin(xml) {
  return /pages\/D0002_driver_login|司机登录/i.test(xml)
}

module.exports = {
  sleep,
  extractKeyNodes,
  dumpUiArtifacts,
  logKeyNodes,
  tapByAnyText,
  tapInputByLabels,
  fillInputByLabels,
  clearAndFillInput,
  confirmNativePicker,
  scrollDown,
  requireTap,
  isLoggedInClient,
  isLoggedInDriver,
  isOnClientLogin,
  isOnDriverLogin
}
