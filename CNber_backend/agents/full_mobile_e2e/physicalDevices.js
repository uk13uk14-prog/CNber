/**
 * 双 Android 真机：识别 serial、健康检查、排除 emulator。
 */
const adb = require('../_shared/adb')

const HBUILDER_MANUAL_MSG =
  '请在 HBuilderX 手动选择对应设备运行一次（同步后仍停留在 HBuilder 基座页，未进入登录页/首页）'

function isEmulatorSerial(serial) {
  return /^emulator-\d+$/i.test(String(serial || ''))
}

async function listAllDevices() {
  return adb.listAndroidDevices()
}

async function listPhysicalDevices() {
  const all = await listAllDevices()
  return all.filter((d) => !isEmulatorSerial(d.id)).map((d) => d.id)
}

async function resolveDevicePair() {
  const physical = await listPhysicalDevices()
  const clientEnv = process.env.CLIENT_DEVICE || process.env.E2E_CLIENT_DEVICE
  const driverEnv = process.env.DRIVER_DEVICE || process.env.E2E_DRIVER_DEVICE

  if (clientEnv && driverEnv) {
    if (clientEnv === driverEnv) {
      throw new Error('CLIENT_DEVICE 与 DRIVER_DEVICE 不能相同')
    }
    for (const serial of [clientEnv, driverEnv]) {
      if (isEmulatorSerial(serial)) {
        throw new Error(`指定设备 ${serial} 为 emulator，真机模式请使用 physical device serial`)
      }
    }
    return {
      clientDevice: clientEnv,
      driverDevice: driverEnv,
      source: 'env',
      available: physical
    }
  }

  if (physical.length < 2) {
    throw new Error(
      `需要 2 台已连接的 Android 真机（当前 physical=${physical.length}）。` +
        `已连接: ${physical.join(', ') || '无'}。` +
        `请 USB 调试连接两台手机，或设置 CLIENT_DEVICE / DRIVER_DEVICE。`
    )
  }

  return {
    clientDevice: clientEnv || physical[0],
    driverDevice: driverEnv || physical[1],
    source: clientEnv || driverEnv ? 'env+auto' : 'auto',
    available: physical
  }
}

async function inspectDevice(serial) {
  const info = {
    serial,
    state: '',
    bootCompleted: '',
    wmSize: '',
    cnberPackages: []
  }

  try {
    const { stdout: stateOut } = await adb.execAdb(['get-state'], serial)
    info.state = String(stateOut || '').trim()
  } catch (err) {
    info.state = err.message || 'error'
  }

  try {
    const { stdout: bootOut } = await adb.execAdb(['shell', 'getprop', 'sys.boot_completed'], serial)
    info.bootCompleted = String(bootOut || '').trim()
  } catch {
    info.bootCompleted = 'unknown'
  }

  try {
    const { stdout: sizeOut } = await adb.execAdb(['shell', 'wm', 'size'], serial)
    info.wmSize = String(sizeOut || '').trim().replace(/\s+/g, ' ')
  } catch {
    info.wmSize = 'unknown'
  }

  try {
    const { stdout: pkgOut } = await adb.execAdb(['shell', 'pm', 'list', 'packages'], serial)
    info.cnberPackages = String(pkgOut || '')
      .split('\n')
      .map((l) => l.replace('package:', '').trim())
      .filter((p) => /cnber|uni\.|hbuilder|dcloud/i.test(p))
  } catch {
    info.cnberPackages = []
  }

  if (info.state !== 'device') {
    throw new Error(`设备 ${serial} 状态异常: ${info.state}`)
  }
  if (info.bootCompleted !== '1') {
    throw new Error(`设备 ${serial} 未完成启动 (boot_completed=${info.bootCompleted})`)
  }

  return info
}

async function ensureTwoPhysicalDevices() {
  const pair = await resolveDevicePair()
  const clientInfo = await inspectDevice(pair.clientDevice)
  const driverInfo = await inspectDevice(pair.driverDevice)
  return {
    clientDevice: pair.clientDevice,
    driverDevice: pair.driverDevice,
    source: pair.source,
    available: pair.available,
    clientInfo,
    driverInfo
  }
}

module.exports = {
  HBUILDER_MANUAL_MSG,
  isEmulatorSerial,
  listAllDevices,
  listPhysicalDevices,
  resolveDevicePair,
  inspectDevice,
  ensureTwoPhysicalDevices
}
