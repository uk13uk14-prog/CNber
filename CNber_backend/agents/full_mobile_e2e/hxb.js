const fs = require('fs')
const path = require('path')
const adb = require('../_shared/adb')

const HXB_CLI =
  process.env.HBUILDERX_CLI ||
  process.env.HXB_CLI ||
  'C:\\Users\\eulan\\Desktop\\HBuilderX\\cli.exe'

const BACKEND_ROOT = path.join(__dirname, '..', '..')
const CLIENT_PROJECT = path.join(BACKEND_ROOT, '..', 'CNber_client_admin_v1.0')
const DRIVER_PROJECT = path.join(BACKEND_ROOT, '..', 'CNber_driver_admin_v1.0')

const E2E_API_BASE_EMULATOR = process.env.E2E_API_BASE_URL || 'http://10.0.2.2:3100/api'
const envBackups = []

function resolveApiBaseUrl(lanIp) {
  if (process.env.E2E_API_BASE_URL) return process.env.E2E_API_BASE_URL
  if (lanIp) return `http://${lanIp}:3100/api`
  return E2E_API_BASE_EMULATOR
}

function backupAndWriteEnv(projectPath, apiBaseUrl) {
  const envPath = path.join(projectPath, '.env')
  const backupPath = path.join(projectPath, '.env.e2e_backup')
  const url = apiBaseUrl || E2E_API_BASE_EMULATOR
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, backupPath)
    envBackups.push({ envPath, backupPath, hadOriginal: true })
  } else {
    envBackups.push({ envPath, backupPath, hadOriginal: false })
  }
  fs.writeFileSync(envPath, `UNI_APP_API_BASE_URL=${url}\n`, 'utf8')
}

function restoreEnvFiles() {
  for (const item of envBackups) {
    if (item.hadOriginal && fs.existsSync(item.backupPath)) {
      fs.copyFileSync(item.backupPath, item.envPath)
      fs.unlinkSync(item.backupPath)
    } else if (!item.hadOriginal && fs.existsSync(item.envPath)) {
      fs.unlinkSync(item.envPath)
      if (fs.existsSync(item.backupPath)) fs.unlinkSync(item.backupPath)
    }
  }
  envBackups.length = 0
}

function prepareMobileApiEnv(apiBaseUrl) {
  const url = apiBaseUrl || resolveApiBaseUrl()
  backupAndWriteEnv(CLIENT_PROJECT, url)
  backupAndWriteEnv(DRIVER_PROJECT, url)
  return url
}

async function setupAdbReverse(deviceId) {
  const physical = require('./physicalDevices')
  if (physical.isEmulatorSerial(deviceId)) {
    await adb.execAdb(['reverse', 'tcp:3100', 'tcp:3100'], deviceId)
  }
}

async function syncAndVerifyApp({ deviceId, role, projectName, label, captureScreenshot }) {
  if (!fs.existsSync(HXB_CLI)) {
    throw new Error(`HBuilderX CLI 不存在: ${HXB_CLI}，无法同步 ${label}`)
  }
  hxbLaunchAndroid(projectName, deviceId)
  const appReady = require('./appReady')
  const info = await appReady.ensureAppReady({
    deviceId,
    role,
    label,
    captureScreenshot,
    allowHbuilderSync: true,
    apkMode: false
  })
  const focus = await appReady.getForeground(deviceId)
  const ui = await appReady.isLoginOrHome(deviceId, role)
  if (appReady.isStuckOnHbuilderBase(focus, ui)) {
    if (captureScreenshot) await captureScreenshot(`${role}_hbuilder_stuck`)
    throw new Error(appReady.HBUILDER_MANUAL_MSG)
  }
  return info
}

function resolveClientApk() {
  const candidates = [
    process.env.MOBILE_AGENT_APK,
    path.join(BACKEND_ROOT, 'runtime', 'apk', 'cnber_client.apk'),
    path.join(BACKEND_ROOT, 'runtime', 'apk', 'client.apk')
  ].filter(Boolean)
  return candidates.find((p) => fs.existsSync(p)) || null
}

function resolveDriverApk() {
  const candidates = [
    process.env.MOBILE_AGENT_DRIVER_APK,
    path.join(BACKEND_ROOT, 'runtime', 'apk', 'cnber_driver.apk'),
    path.join(BACKEND_ROOT, 'runtime', 'apk', 'driver.apk')
  ].filter(Boolean)
  return candidates.find((p) => fs.existsSync(p)) || null
}

function copyLatestClientApkFromCache() {
  const target = path.join(BACKEND_ROOT, 'runtime', 'apk', 'cnber_client.apk')
  if (fs.existsSync(target)) return target

  const cacheDir =
    'C:\\Users\\eulan\\Documents\\HBuilderProjects\\260413\\CNber\\CNber_client_admin_v1.0\\unpackage\\release\\apk'
  if (!fs.existsSync(cacheDir)) return null

  const apks = fs
    .readdirSync(cacheDir)
    .filter((f) => f.endsWith('.apk'))
    .map((f) => ({
      full: path.join(cacheDir, f),
      mtime: fs.statSync(path.join(cacheDir, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime)

  if (!apks.length) return null
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(apks[0].full, target)
  return target
}

function hxbLaunchAndroid(projectNameOrPath, deviceId, { compileOnly = false } = {}) {
  if (!fs.existsSync(HXB_CLI)) {
    throw new Error(`HBuilderX CLI 不存在: ${HXB_CLI}`)
  }
  const { execFileSync } = require('child_process')
  const args = ['launch', 'app-android', '--project', projectNameOrPath, '--deviceId', deviceId]
  if (compileOnly) args.push('--compile', 'true')
  execFileSync(HXB_CLI, args, { encoding: 'utf8', timeout: 600000, stdio: 'inherit', shell: true })
}

function hxbScreencap(projectPath, deviceId, saveFile) {
  if (!fs.existsSync(HXB_CLI)) return false
  const { execFileSync } = require('child_process')
  fs.mkdirSync(path.dirname(saveFile), { recursive: true })
  execFileSync(
    HXB_CLI,
    [
      'screencap',
      'app-android',
      '--project',
      projectPath,
      '--deviceId',
      deviceId,
      '--saveFile',
      saveFile
    ],
    { encoding: 'utf8', timeout: 60000, stdio: 'pipe', shell: true }
  )
  return fs.existsSync(saveFile)
}

module.exports = {
  HXB_CLI,
  CLIENT_PROJECT,
  DRIVER_PROJECT,
  E2E_API_BASE_EMULATOR,
  resolveApiBaseUrl,
  prepareMobileApiEnv,
  restoreEnvFiles,
  setupAdbReverse,
  resolveClientApk,
  resolveDriverApk,
  copyLatestClientApkFromCache,
  hxbLaunchAndroid,
  hxbScreencap,
  syncAndVerifyApp
}
