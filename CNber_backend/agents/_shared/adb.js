const { execFile, execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

const ADB_BIN = process.env.ADB_PATH || 'adb'
const RECONNECT_WAIT_MS = Number(process.env.ADB_RECONNECT_WAIT_MS || 10000)
const RECONNECT_MAX_RETRIES = Number(process.env.ADB_RECONNECT_MAX_RETRIES || 3)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isAdbDeviceError(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  return (
    msg.includes('error: closed') ||
    msg.includes('device offline') ||
    msg.includes('device not found') ||
    msg.includes("' not found") ||
    msg.includes('no devices/emulators found') ||
    msg.includes('no devices') ||
    msg.includes('failed to get feature')
  )
}

async function reconnectDevice(deviceId) {
  console.log(`  [adb] reconnect ${deviceId} ...`)
  try {
    await execFileAsync(ADB_BIN, ['-s', deviceId, 'reconnect'], { timeout: 20000 })
  } catch {
    try {
      await execFileAsync(ADB_BIN, ['reconnect'], { timeout: 20000 })
    } catch {
      /* ignore */
    }
  }
  await sleep(RECONNECT_WAIT_MS)
  const devices = await listAndroidDevices()
  const online = devices.some((d) => d.id === deviceId)
  console.log(
    online
      ? `  [adb] ${deviceId} 已恢复 (adb devices)`
      : `  [adb] ${deviceId} 仍未在线 (adb devices: ${devices.map((d) => d.id).join(', ') || '无'})`
  )
  return online
}

async function withAdbReconnect(deviceId, fn) {
  if (!deviceId) return fn()

  let lastErr
  for (let attempt = 0; attempt <= RECONNECT_MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (!isAdbDeviceError(err) || attempt >= RECONNECT_MAX_RETRIES) {
        throw err
      }
      console.warn(
        `  [adb] ${deviceId} 断线，重试 ${attempt + 1}/${RECONNECT_MAX_RETRIES}: ${err.message}`
      )
      await reconnectDevice(deviceId)
    }
  }
  throw lastErr
}

function parseDevices(stdout) {
  return String(stdout || '')
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('*'))
    .map((line) => {
      const [id, state] = line.split(/\s+/)
      return { id, state: state || 'unknown' }
    })
    .filter((d) => d.state === 'device')
}

async function listAndroidDevices() {
  try {
    const { stdout } = await execFileAsync(ADB_BIN, ['devices'], { timeout: 8000 })
    return parseDevices(stdout)
  } catch {
    return []
  }
}

async function hasAndroidDevice() {
  const devices = await listAndroidDevices()
  return devices.length > 0
}

function adbArgs(deviceId, args) {
  return deviceId ? ['-s', deviceId, ...args] : args
}

async function execAdb(args, deviceId) {
  return withAdbReconnect(deviceId, async () => {
    const { stdout, stderr } = await execFileAsync(ADB_BIN, adbArgs(deviceId, args), {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024
    })
    return { stdout: String(stdout || ''), stderr: String(stderr || '') }
  })
}

function execAdbSync(args, deviceId) {
  const out = execFileSync(ADB_BIN, adbArgs(deviceId, args), {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf8'
  })
  return String(out || '')
}

async function screencap(filePath, deviceId) {
  return withAdbReconnect(deviceId, async () => {
    const dir = path.dirname(filePath)
    fs.mkdirSync(dir, { recursive: true })
    const { stdout } = await execFileAsync(
      ADB_BIN,
      adbArgs(deviceId, ['exec-out', 'screencap', '-p']),
      { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024, timeout: 20000 }
    )
    fs.writeFileSync(filePath, stdout)
  })
}

async function dumpUi(deviceId) {
  const remote = '/sdcard/cnber_ui_dump.xml'
  await execAdb(['shell', 'uiautomator', 'dump', remote], deviceId)
  const { stdout } = await execAdb(['shell', 'cat', remote], deviceId)
  return stdout
}

function parseBounds(boundsStr) {
  const m = String(boundsStr || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/)
  if (!m) return null
  const x1 = Number(m[1])
  const y1 = Number(m[2])
  const x2 = Number(m[3])
  const y2 = Number(m[4])
  return {
    x: Math.round((x1 + x2) / 2),
    y: Math.round((y1 + y2) / 2),
    x1,
    y1,
    x2,
    y2
  }
}

function findNodeByText(xml, text, { partial = true } = {}) {
  const pattern = partial
    ? new RegExp(`text="[^"]*${escapeRegExp(text)}[^"]*"[^>]*bounds="(\\[[^"]+\\])"`, 'i')
    : new RegExp(`text="${escapeRegExp(text)}"[^>]*bounds="(\\[[^"]+\\])"`, 'i')
  const m = String(xml || '').match(pattern)
  if (!m) return null
  return parseBounds(m[1])
}

function findNodeByContentDesc(xml, desc, { partial = true } = {}) {
  const pattern = partial
    ? new RegExp(`content-desc="[^"]*${escapeRegExp(desc)}[^"]*"[^>]*bounds="(\\[[^"]+\\])"`, 'i')
    : new RegExp(`content-desc="${escapeRegExp(desc)}"[^>]*bounds="(\\[[^"]+\\])"`, 'i')
  const m = String(xml || '').match(pattern)
  if (!m) return null
  return parseBounds(m[1])
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function tap(x, y, deviceId) {
  await execAdb(['shell', 'input', 'tap', String(x), String(y)], deviceId)
}

async function inputText(text, deviceId) {
  const safe = String(text).replace(/\s/g, '%s')
  await execAdb(['shell', 'input', 'text', safe], deviceId)
}

async function swipe(deviceId, x1, y1, x2, y2, durationMs = 400) {
  await execAdb(
    ['shell', 'input', 'swipe', String(x1), String(y1), String(x2), String(y2), String(durationMs)],
    deviceId
  )
}

async function scrollDown(deviceId) {
  await swipe(deviceId, 540, 1700, 540, 700, 450)
}

async function pressKey(keyCode, deviceId) {
  await execAdb(['shell', 'input', 'keyevent', String(keyCode)], deviceId)
}

async function launchPackage(packageName, deviceId) {
  await execAdb(
    ['shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1'],
    deviceId
  )
}

async function getForegroundActivity(deviceId) {
  const { stdout } = await execAdb(['shell', 'dumpsys', 'window'], deviceId)
  const line = String(stdout || '')
    .split('\n')
    .find((l) => l.includes('mCurrentFocus'))
  if (!line) return { raw: '', package: '', activity: '' }
  const m = line.match(/([a-zA-Z0-9_.]+)\/([a-zA-Z0-9_.]+)/)
  return {
    raw: line.trim(),
    package: m ? m[1] : '',
    activity: m ? m[2] : ''
  }
}

async function listInstalledPackages(deviceId) {
  const { stdout } = await execAdb(['shell', 'pm', 'list', 'packages'], deviceId)
  return String(stdout || '')
    .split('\n')
    .map((l) => l.replace('package:', '').trim())
    .filter(Boolean)
}

async function installApk(apkPath, deviceId) {
  const abs = path.resolve(apkPath)
  if (!fs.existsSync(abs)) {
    throw new Error(`APK 不存在: ${abs}`)
  }
  const { stdout, stderr } = await execAdb(['install', '-r', abs], deviceId)
  const out = `${stdout}\n${stderr}`
  if (!/Success/i.test(out)) {
    throw new Error(out.trim() || 'adb install 失败')
  }
  return abs
}

async function discoverClientPackage(deviceId) {
  if (process.env.MOBILE_AGENT_PACKAGE) {
    return process.env.MOBILE_AGENT_PACKAGE
  }
  const { stdout } = await execAdb(['shell', 'pm', 'list', 'packages'], deviceId)
  const packages = String(stdout || '')
    .split('\n')
    .map((l) => l.replace('package:', '').trim())
    .filter(Boolean)

  const hints = ['cnber', 'zhongbu', 'uni_gb3b7688', 'gb3b7688', 'uni9c0d755', 'client', 'zhongbu']
  for (const hint of hints) {
    const hit = packages.find((p) => p.toLowerCase().includes(hint))
    if (hit) return hit
  }
  return null
}

async function tapByText(text, deviceId, options) {
  const xml = await dumpUi(deviceId)
  const node = findNodeByText(xml, text, options) || findNodeByContentDesc(xml, text, options)
  if (!node) return false
  await tap(node.x, node.y, deviceId)
  return true
}

async function tapByAnyLabels(deviceId, labels, options = {}) {
  const xml = options.xml || (await dumpUi(deviceId))
  for (const label of labels) {
    const node =
      findNodeByText(xml, label, { partial: true, ...options }) ||
      findNodeByContentDesc(xml, label, { partial: true, ...options })
    if (node) {
      await tap(node.x, node.y, deviceId)
      return label
    }
  }
  return null
}

function findEditTextNearLabel(xml, labels) {
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
    if (em) return parseBounds(em[1])
    return parseBounds(lm[1])
  }
  return null
}

async function tapInputNearLabel(deviceId, labels, xml) {
  const source = xml || (await dumpUi(deviceId))
  const node = findEditTextNearLabel(source, labels)
  if (!node) return false
  await tap(node.x, node.y, deviceId)
  return true
}

module.exports = {
  ADB_BIN,
  RECONNECT_WAIT_MS,
  RECONNECT_MAX_RETRIES,
  listAndroidDevices,
  hasAndroidDevice,
  isAdbDeviceError,
  reconnectDevice,
  withAdbReconnect,
  execAdb,
  execAdbSync,
  screencap,
  dumpUi,
  findNodeByText,
  findNodeByContentDesc,
  tap,
  inputText,
  pressKey,
  swipe,
  scrollDown,
  launchPackage,
  getForegroundActivity,
  listInstalledPackages,
  discoverClientPackage,
  installApk,
  tapByText,
  tapByAnyLabels,
  findEditTextNearLabel,
  tapInputNearLabel,
  parseBounds
}
