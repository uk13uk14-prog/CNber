/**
 * 独立 APK 模式：默认路径，不依赖 HBuilder 基座。
 * HBuilder 基座仅当 FULL_MOBILE_E2E_USE_HBUILDER=1 时启用。
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const adb = require('../_shared/adb')
const appReady = require('./appReady')

const BACKEND_ROOT = path.join(__dirname, '..', '..')
const HBUILDER_PKG = 'io.dcloud.HBuilder'

const CLIENT_APK_REL = 'runtime/apk/cnber_client.apk'
const DRIVER_APK_REL = 'runtime/apk/cnber_driver.apk'

function isHbuilderFallbackMode() {
  return process.env.FULL_MOBILE_E2E_USE_HBUILDER === '1'
}

function isPhysicalTarget() {
  return process.env.E2E_USE_EMULATOR !== '1' && process.env.E2E_TARGET !== 'emulator'
}

function getModeLabel(isPhysical, launchPlan) {
  if (isPhysical) {
    const c = launchPlan?.client || 'sync'
    const d = launchPlan?.driver || 'sync'
    if (c === 'takeover' && d === 'takeover') return 'Physical takeover mode (skip sync)'
    const parts = [`Physical (${c}/${d})`]
    if (launchPlan?.client === 'apk' || launchPlan?.driver === 'apk') parts.push('+ APK')
    return parts.join(' ')
  }
  if (isHbuilderFallbackMode()) return 'Emulator HBuilder fallback mode'
  return 'Emulator APK mode'
}

function resolveLaunchPlan(isPhysical, apkCheck) {
  if (!isPhysical) {
    const useApk = !isHbuilderFallbackMode()
    return {
      client: useApk ? 'apk' : 'sync',
      driver: useApk ? 'apk' : 'sync',
      requireAllApks: useApk
    }
  }
  const syncFirst = process.env.E2E_SYNC_FIRST !== '0'
  const forceApk = process.env.E2E_USE_APK === '1'
  const pick = (exists) => {
    if (forceApk && exists) return 'apk'
    if (!syncFirst) return 'takeover'
    return 'sync'
  }
  return {
    client: pick(apkCheck.clientExists),
    driver: pick(apkCheck.driverExists),
    requireAllApks: false
  }
}

function getApkPaths() {
  const envClient = process.env.MOBILE_AGENT_APK
  const envDriver = process.env.MOBILE_AGENT_DRIVER_APK
  return {
    client: envClient || path.join(BACKEND_ROOT, CLIENT_APK_REL),
    driver: envDriver || path.join(BACKEND_ROOT, DRIVER_APK_REL),
    clientRel: envClient ? path.basename(envClient) : CLIENT_APK_REL,
    driverRel: envDriver ? path.basename(envDriver) : DRIVER_APK_REL
  }
}

function checkApks() {
  const paths = getApkPaths()
  const clientExists = fs.existsSync(paths.client)
  const driverExists = fs.existsSync(paths.driver)
  return {
    paths,
    clientExists,
    driverExists,
    allPresent: clientExists && driverExists
  }
}

function buildMissingApkMessage(check) {
  const missing = []
  if (!check.clientExists) missing.push(check.paths.clientRel || CLIENT_APK_REL)
  if (!check.driverExists) missing.push(check.paths.driverRel || DRIVER_APK_REL)
  return `Missing APK:\n${missing.map((m) => `  ${m}`).join('\n')}`
}

function findAapt() {
  const sdk =
    process.env.ANDROID_SDK_ROOT ||
    process.env.ANDROID_HOME ||
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
  const btDir = path.join(sdk, 'build-tools')
  if (!fs.existsSync(btDir)) return null
  const versions = fs
    .readdirSync(btDir)
    .filter((d) => fs.existsSync(path.join(btDir, d, 'aapt.exe')))
    .sort()
    .reverse()
  return versions.length ? path.join(btDir, versions[0], 'aapt.exe') : null
}

function getPackageFromApk(apkPath) {
  const aapt = findAapt()
  if (!aapt) return null
  try {
    const out = execFileSync(aapt, ['dump', 'badging', apkPath], {
      encoding: 'utf8',
      timeout: 15000
    })
    const m = out.match(/package: name='([^']+)'/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

async function discoverApkPackage(deviceId, role, expectedFromApk) {
  if (expectedFromApk && expectedFromApk !== HBUILDER_PKG) {
    const packages = await appReady.listPackages(deviceId)
    if (packages.includes(expectedFromApk)) return expectedFromApk
  }
  const packages = await appReady.listPackages(deviceId)
  const hints =
    role === 'driver'
      ? ['gc5035bb', 'uni_gc5035bb', 'driver', 'cnber']
      : ['uni9c0d755', 'uni_gb3b7688', 'gb3b7688', 'cnber', 'client']
  for (const hint of hints) {
    const hit = packages.find(
      (p) => p.toLowerCase().includes(hint) && p !== HBUILDER_PKG && !p.startsWith('io.dcloud')
    )
    if (hit) return hit
  }
  return packages.find((p) => p.startsWith('uni.') && p !== HBUILDER_PKG) || null
}

/**
 * APK 模式：安装、查包名、启动、确认登录页。
 */
const physicalDevices = require('./physicalDevices')

async function installLaunchAndVerify({ deviceId, apkPath, role, label, captureScreenshot }) {
  const result = {
    apkPath,
    apkExists: fs.existsSync(apkPath),
    packageFromApk: null,
    installOk: false,
    installDetail: '',
    package: null,
    launchOk: false,
    loginPageOk: false,
    screenshot: null,
    focus: '',
    canContinue: false,
    detail: ''
  }

  if (!result.apkExists) {
    throw new Error(`${label}: APK 不存在 ${apkPath}`)
  }

  result.packageFromApk = getPackageFromApk(apkPath)

  if (physicalDevices.isEmulatorSerial(deviceId)) {
    await adb.execAdb(['reverse', 'tcp:3100', 'tcp:3100'], deviceId).catch(() => {})
  }

  try {
    await adb.installApk(apkPath, deviceId)
    result.installOk = true
    result.installDetail = 'Success'
  } catch (err) {
    result.installDetail = err.message || String(err)
    throw new Error(`${label}: APK 安装失败 — ${result.installDetail}`)
  }

  result.package =
    result.packageFromApk ||
    (await discoverApkPackage(deviceId, role, result.packageFromApk))
  if (!result.package || result.package === HBUILDER_PKG) {
    if (captureScreenshot) result.screenshot = await captureScreenshot(`${role}_no_package`)
    throw new Error(`${label}: 安装后未找到独立 App 包名（仍为 HBuilder 基座或未识别 uni 包）`)
  }

  await appReady.forceLaunchApp(result.package, deviceId)
  result.launchOk = true

  const ready = await appReady.ensureAppReady({
    deviceId,
    role,
    label,
    captureScreenshot,
    apkMode: true,
    expectedPackage: result.package
  })

  result.loginPageOk = true
  result.focus = ready.focus
  result.package = ready.package
  result.canContinue = true
  result.detail = ready.log
  return result
}

module.exports = {
  HBUILDER_PKG,
  CLIENT_APK_REL,
  DRIVER_APK_REL,
  isHbuilderFallbackMode,
  isPhysicalTarget,
  getModeLabel,
  resolveLaunchPlan,
  getApkPaths,
  checkApks,
  buildMissingApkMessage,
  getPackageFromApk,
  discoverApkPackage,
  installLaunchAndVerify
}
