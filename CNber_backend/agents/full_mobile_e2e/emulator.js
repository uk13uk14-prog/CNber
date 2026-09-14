const { spawn, execFileSync } = require('child_process')
const path = require('path')
const adb = require('../_shared/adb')

const SDK_ROOT =
  process.env.ANDROID_SDK_ROOT ||
  process.env.ANDROID_HOME ||
  path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')

const EMULATOR_BIN = process.env.EMULATOR_PATH || path.join(SDK_ROOT, 'emulator', 'emulator.exe')
const AVDMANAGER =
  process.env.AVDMANAGER_PATH ||
  path.join(SDK_ROOT, 'cmdline-tools', 'latest', 'bin', 'avdmanager.bat')

const PRIMARY_AVD = process.env.E2E_AVD_PRIMARY || 'CNber_Pixel_7_API_34'
const SECONDARY_AVD = process.env.E2E_AVD_SECONDARY || 'CNber_Emulator_2'
const CLIENT_PORT = Number(process.env.E2E_CLIENT_PORT || 5554)
const DRIVER_PORT = Number(process.env.E2E_DRIVER_PORT || 5556)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function listAvds() {
  try {
    const out = execFileSync(EMULATOR_BIN, ['-list-avds'], { encoding: 'utf8', timeout: 15000 })
    return String(out || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function ensureSecondaryAvd() {
  const avds = listAvds()
  if (avds.includes(SECONDARY_AVD)) return SECONDARY_AVD
  if (!avds.includes(PRIMARY_AVD)) {
    throw new Error(`未找到 AVD: ${PRIMARY_AVD}，请先运行 scripts/setup_android_sdk.ps1`)
  }
  // 复用同一 AVD，第二实例以 -read-only 启动（无需 avdmanager 再建 AVD）
  return PRIMARY_AVD
}

function startEmulator(avdName, port, readOnly = false) {
  const serial = `emulator-${port}`
  const args = [
    '-avd',
    avdName,
    '-port',
    String(port),
    '-no-snapshot-load',
    '-no-boot-anim',
    '-gpu',
    'swiftshader_indirect'
  ]
  if (readOnly) args.push('-read-only')
  const child = spawn(EMULATOR_BIN, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  })
  child.unref()
  return serial
}

async function waitForDevice(serial, timeoutMs = 180000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const devices = await adb.listAndroidDevices()
    const hit = devices.find((d) => d.id === serial)
    if (hit) {
      try {
        const { stdout } = await adb.execAdb(['shell', 'getprop', 'sys.boot_completed'], serial)
        if (String(stdout || '').trim() === '1') return serial
      } catch {
        /* booting */
      }
    }
    await sleep(3000)
  }
  throw new Error(`设备 ${serial} 启动超时 (${timeoutMs}ms)`)
}

async function ensureTwoEmulators() {
  const avds = listAvds()
  const primaryAvd = avds.includes(PRIMARY_AVD) ? PRIMARY_AVD : avds[0]
  if (!primaryAvd) {
    throw new Error('未找到可用 AVD，请先运行 scripts/setup_android_sdk.ps1')
  }
  const secondaryAvd = avds.includes(SECONDARY_AVD) ? SECONDARY_AVD : ensureSecondaryAvd()

  const existing = await adb.listAndroidDevices()
  const clientSerial = `emulator-${CLIENT_PORT}`
  const driverSerial = `emulator-${DRIVER_PORT}`

  const launched = []
  if (!existing.some((d) => d.id === clientSerial)) {
    startEmulator(primaryAvd, CLIENT_PORT, false)
    launched.push(clientSerial)
  }
  if (!existing.some((d) => d.id === driverSerial)) {
    startEmulator(secondaryAvd, DRIVER_PORT, secondaryAvd === primaryAvd)
    launched.push(driverSerial)
  }

  await waitForDevice(clientSerial)
  await waitForDevice(driverSerial)

  return {
    clientDevice: clientSerial,
    driverDevice: driverSerial,
    launched,
    avd: `${primaryAvd} + ${secondaryAvd}`
  }
}

module.exports = {
  SDK_ROOT,
  EMULATOR_BIN,
  ensureTwoEmulators,
  waitForDevice,
  listAvds
}
