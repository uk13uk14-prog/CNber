const { execFile, execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

const ADB_BIN = process.env.ADB_PATH || 'adb'

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
  const { stdout, stderr } = await execFileAsync(ADB_BIN, adbArgs(deviceId, args), {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024
  })
  return { stdout: String(stdout || ''), stderr: String(stderr || '') }
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
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const { stdout } = await execFileAsync(
    ADB_BIN,
    adbArgs(deviceId, ['exec-out', 'screencap', '-p']),
    { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024, timeout: 20000 }
  )
  fs.writeFileSync(filePath, stdout)
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

async function pressKey(keyCode, deviceId) {
  await execAdb(['shell', 'input', 'keyevent', String(keyCode)], deviceId)
}

async function launchPackage(packageName, deviceId) {
  await execAdb(
    ['shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1'],
    deviceId
  )
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

  const hints = ['cnber', 'zhongbu', 'uni_gb3b7688', 'gb3b7688', 'client', 'zhongbu']
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

module.exports = {
  ADB_BIN,
  listAndroidDevices,
  hasAndroidDevice,
  execAdb,
  execAdbSync,
  screencap,
  dumpUi,
  findNodeByText,
  tap,
  inputText,
  pressKey,
  launchPackage,
  discoverClientPackage,
  tapByText
}
