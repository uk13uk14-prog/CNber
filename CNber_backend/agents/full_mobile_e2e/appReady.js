/**
 * 检测/拉起 CNber App，确认进入登录页或首页后再继续 E2E。
 * 不假设 HBuilder 同步完成 = App 已启动。
 */
const adb = require('../_shared/adb')

const STEP_WAIT_MS = Number(process.env.E2E_STEP_WAIT_MS || 60000)
const TAKEOVER_WAIT_MS = Number(process.env.E2E_TAKEOVER_WAIT_MS || 15000)
const POLL_MS = 2000

const SYNC_ACTIVITIES = [
  'PullDebugActivity',
  'debug.PullDebug',
  'SyncDebugActivity',
  'WebviewActivity'
]

const CLIENT_UI_MARKERS = ['请输入手机号', '登录', '接机', '预约', '我的订单', '首页', 'CNber']
const DRIVER_UI_MARKERS = ['请输入手机号', '登录', '司机', '订单', '指派', '接单', 'CNber']

const CLIENT_PKG_HINTS = [
  'uni9c0d755',
  'uni_gb3b7688',
  'gb3b7688',
  'cnber',
  'zhongbu',
  'client'
]
const DRIVER_PKG_HINTS = [
  'gc5035bb',
  'uni_gc5035bb',
  'driver',
  'cnber'
]

const HBUILDER_PKG = 'io.dcloud.HBuilder'

const HBUILDER_MANUAL_MSG =
  '请在 HBuilderX 手动选择对应设备运行一次（同步后仍停留在 HBuilder 基座页，未进入登录页/首页）'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isHbuilderFallback() {
  return (
    process.env.FULL_MOBILE_E2E_USE_HBUILDER === '1' ||
    process.env.E2E_ALLOW_HBUILDER === '1'
  )
}

function isStuckOnHbuilderBase(focus, ui) {
  if (isSyncOrDebugActivity(focus)) return true
  if (isHbuilderBasePackage(focus.package) && !ui?.ready) return true
  if (
    isHbuilderBasePackage(focus.package) &&
    focus.activity.includes('PandoraEntry') &&
    !ui?.ready
  ) {
    return true
  }
  return false
}

async function listPackages(deviceId) {
  const { stdout } = await adb.execAdb(['shell', 'pm', 'list', 'packages'], deviceId)
  return String(stdout || '')
    .split('\n')
    .map((l) => l.replace('package:', '').trim())
    .filter(Boolean)
}

function isHbuilderBasePackage(pkg) {
  return pkg === HBUILDER_PKG || pkg === 'io.dcloud.hbuilder'
}

function pickPackages(packages, hints, envOverride, { apkMode = false, allowHbuilderSync = false } = {}) {
  if (envOverride) return [envOverride]
  const ordered = []
  if (
    !apkMode &&
    (useHbuilderFallback() || allowHbuilderSync) &&
    packages.includes(HBUILDER_PKG)
  ) {
    ordered.push(HBUILDER_PKG)
  }
  for (const hint of hints) {
    const hit = packages.find(
      (p) =>
        p.toLowerCase().includes(hint.toLowerCase()) &&
        !isHbuilderBasePackage(p)
    )
    if (hit && !ordered.includes(hit)) ordered.push(hit)
  }
  if (apkMode) {
    return ordered.filter((p) => p.startsWith('uni.') && !isHbuilderBasePackage(p))
  }
  return ordered
}

async function discoverClientPackage(deviceId, options = {}) {
  const packages = await listPackages(deviceId)
  const list = pickPackages(packages, CLIENT_PKG_HINTS, process.env.MOBILE_AGENT_PACKAGE, options)
  if (list.length) return list[0]
  if (options.apkMode) return null
  const extra = await adb.discoverClientPackage(deviceId)
  return extra && !isHbuilderBasePackage(extra) ? extra : null
}

async function discoverClientPackages(deviceId, options = {}) {
  const packages = await listPackages(deviceId)
  const list = pickPackages(packages, CLIENT_PKG_HINTS, process.env.MOBILE_AGENT_PACKAGE, options)
  if (!options.apkMode) {
    const extra = await adb.discoverClientPackage(deviceId)
    if (extra && !list.includes(extra) && !isHbuilderBasePackage(extra)) list.push(extra)
  }
  if (options.allowHbuilderSync && packages.includes(HBUILDER_PKG) && !list.includes(HBUILDER_PKG)) {
    list.unshift(HBUILDER_PKG)
  }
  return list
}

async function discoverDriverPackage(deviceId, options = {}) {
  const packages = await listPackages(deviceId)
  const list = pickPackages(packages, DRIVER_PKG_HINTS, process.env.MOBILE_AGENT_DRIVER_PACKAGE, options)
  return list[0] || null
}

async function discoverDriverPackages(deviceId, options = {}) {
  const packages = await listPackages(deviceId)
  const list = pickPackages(packages, DRIVER_PKG_HINTS, process.env.MOBILE_AGENT_DRIVER_PACKAGE, options)
  if (options.allowHbuilderSync && packages.includes(HBUILDER_PKG) && !list.includes(HBUILDER_PKG)) {
    list.unshift(HBUILDER_PKG)
  }
  return list
}

async function getForeground(deviceId) {
  const { stdout } = await adb.execAdb(['shell', 'dumpsys', 'window'], deviceId)
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

function isSyncOrDebugActivity(focus) {
  const act = focus.activity || ''
  return SYNC_ACTIVITIES.some((s) => act.includes(s))
}

function uiHasAnyMarker(xml, markers) {
  for (const m of markers) {
    if (new RegExp(`text="[^"]*${escapeRegExp(m)}`, 'i').test(xml)) return true
    if (new RegExp(`content-desc="[^"]*${escapeRegExp(m)}`, 'i').test(xml)) return true
  }
  return false
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function isLoginOrHome(deviceId, role) {
  const markers = role === 'driver' ? DRIVER_UI_MARKERS : CLIENT_UI_MARKERS
  let xml = ''
  try {
    xml = await adb.dumpUi(deviceId)
  } catch {
    return { ready: false, reason: 'uiautomator dump 失败' }
  }
  if (role === 'client' && /pages\/A\d+|android:id\/datePicker|立即进入|创建订单|Postcode|A0001_client_welcome/i.test(xml)) {
    return { ready: true, reason: 'UI 含 Client 业务页/控件' }
  }
  if (role === 'driver' && /pages\/D\d+|司机首页|司机端工作台/i.test(xml)) {
    return { ready: true, reason: 'UI 含 Driver 业务页' }
  }
  if (uiHasAnyMarker(xml, markers)) {
    return { ready: true, reason: 'UI 含登录/首页标记' }
  }
  if (/同步完成|调试基座|正在同步|PullDebug/.test(xml)) {
    return { ready: false, reason: '仍在 HBuilder 同步/调试页' }
  }
  return { ready: false, reason: '未匹配登录/首页 UI' }
}

async function amStartPandora(packageName, deviceId) {
  const component = `${packageName}/io.dcloud.PandoraEntryActivity`
  try {
    await adb.execAdb(['shell', 'am', 'start', '-n', component], deviceId)
    return true
  } catch {
    return false
  }
}

async function dismissSyncOverlay(deviceId) {
  await adb.tap(540, 1200, deviceId)
  await sleep(800)
  await adb.pressKey('KEYCODE_BACK', deviceId)
  await sleep(800)
}

async function forceLaunchApp(packageName, deviceId) {
  await adb.execAdb(['shell', 'am', 'force-stop', packageName], deviceId).catch(() => {})
  await sleep(500)
  await adb.launchPackage(packageName, deviceId)
  await sleep(1500)
  if (!(await amStartPandora(packageName, deviceId))) {
    await adb.launchPackage(packageName, deviceId)
  }
  await sleep(1500)
}

/**
 * @param {object} opts
 * @param {string} opts.deviceId
 * @param {'client'|'driver'} opts.role
 * @param {string} opts.label
 * @param {(label:string)=>Promise<string>} [opts.captureScreenshot]
 * @param {number} [opts.timeoutMs]
 */
function isInvalidApkModeFocus(focus, ui, apkMode, expectedPackage) {
  if (!apkMode) return false
  if (isHbuilderBasePackage(focus.package)) return true
  if (isSyncOrDebugActivity(focus)) return true
  if (expectedPackage && focus.package && focus.package !== expectedPackage) return true
  if (focus.activity.includes('PandoraEntry') && !ui.ready) return true
  return false
}

/**
 * 接管模式：不启动/不同步，仅验证前台已是 CNber 登录页/首页。
 */
async function verifyTakeoverApp(opts) {
  const { deviceId, role, label, captureScreenshot } = opts
  const timeoutMs = opts.timeoutMs ?? TAKEOVER_WAIT_MS
  const deadline = Date.now() + timeoutMs
  const log = []

  while (Date.now() < deadline) {
    const focus = await getForeground(deviceId)
    const ui = await isLoginOrHome(deviceId, role)
    log.push(`focus=${focus.package}/${focus.activity} ui=${ui.reason}`)

    if (isSyncOrDebugActivity(focus) || isStuckOnHbuilderBase(focus, ui)) {
      if (captureScreenshot) await captureScreenshot(`${role}_hbuilder_stuck`)
      throw new Error(`${label}: ${HBUILDER_MANUAL_MSG} (focus=${focus.raw})`)
    }

    if (ui.ready) {
      const pkg =
        focus.package ||
        (role === 'driver'
          ? await discoverDriverPackage(deviceId, { allowHbuilderSync: true })
          : await discoverClientPackage(deviceId, { allowHbuilderSync: true }))
      if (captureScreenshot) await captureScreenshot(`${role}_app_ready`)
      return {
        package: pkg,
        focus: focus.raw,
        loginPageOk: true,
        log: log.join(' | ')
      }
    }

    await sleep(POLL_MS)
  }

  const focus = await getForeground(deviceId)
  const ui = await isLoginOrHome(deviceId, role)
  if (captureScreenshot) await captureScreenshot(`${role}_app_not_ready`)

  if (
    isSyncOrDebugActivity(focus) ||
    isStuckOnHbuilderBase(focus, ui) ||
    (isHbuilderBasePackage(focus.package) && focus.activity.includes('PandoraEntry'))
  ) {
    throw new Error(`${label}: ${HBUILDER_MANUAL_MSG} (focus=${focus.raw})`)
  }

  throw new Error(
    `${label}: 未检测到登录页/首页，请先在 HBuilderX 手动运行 ${label} 到对应手机 (focus=${focus.raw}; ${log.join(' | ')})`
  )
}

async function ensureAppReady(opts) {
  if (opts.takeoverOnly) {
    return verifyTakeoverApp(opts)
  }

  const {
    deviceId,
    role,
    label,
    captureScreenshot,
    apkMode = false,
    allowHbuilderSync = false,
    expectedPackage
  } = opts
  const timeoutMs = opts.timeoutMs ?? STEP_WAIT_MS
  const deadline = Date.now() + timeoutMs
  const log = []

  const discoverOpts = { apkMode, allowHbuilderSync }
  const pkgList =
    role === 'driver'
      ? await discoverDriverPackages(deviceId, discoverOpts)
      : await discoverClientPackages(deviceId, discoverOpts)

  if (expectedPackage && !pkgList.includes(expectedPackage)) {
    pkgList.unshift(expectedPackage)
  }

  if (!pkgList.length) {
    if (captureScreenshot) await captureScreenshot(`${role}_no_package`)
    const hint = allowHbuilderSync
      ? `${label}: 未找到 CNber 包 — 请先 HBuilderX 同步/运行`
      : `${label}: 未找到已安装的 CNber 独立 APK 包`
    throw new Error(hint)
  }
  log.push(`mode=${apkMode ? 'apk' : 'default'} candidates=${pkgList.join(',')}`)

  let pkgIndex = 0

  while (Date.now() < deadline) {
    const pkg = pkgList[pkgIndex]
    const focus = await getForeground(deviceId)
    log.push(`focus=${focus.package}/${focus.activity}`)

    if (apkMode && isSyncOrDebugActivity(focus)) {
      if (captureScreenshot) await captureScreenshot(`${role}_hbuilder_sync`)
      throw new Error(
        `${label}: 停在 HBuilder 同步/调试页 — APK 模式下请使用独立 APK，勿依赖基座`
      )
    }

    const ui = await isLoginOrHome(deviceId, role)

    if (
      ui.ready &&
      !isSyncOrDebugActivity(focus) &&
      !isInvalidApkModeFocus(focus, ui, apkMode, expectedPackage || pkg)
    ) {
      if (captureScreenshot) {
        await captureScreenshot(`${role}_app_ready`)
      }
      return {
        package: expectedPackage || focus.package || pkg,
        focus: focus.raw,
        loginPageOk: true,
        log: log.join(' | ')
      }
    }

    const needLaunch =
      isSyncOrDebugActivity(focus) ||
      ui.reason.includes('同步') ||
      ui.reason.includes('调试') ||
      isInvalidApkModeFocus(focus, ui, apkMode, expectedPackage || pkg) ||
      focus.package === 'com.android.settings' ||
      (focus.package && !pkgList.includes(focus.package) && !ui.ready)

    if (needLaunch) {
      log.push(`action=launch(${pkg})`)
      if (!apkMode && isSyncOrDebugActivity(focus)) {
        await dismissSyncOverlay(deviceId)
      }
      await forceLaunchApp(pkg, deviceId)
      await sleep(POLL_MS)

      if (Date.now() > deadline - POLL_MS * 2 && pkgIndex < pkgList.length - 1) {
        pkgIndex += 1
        log.push(`switch_package=${pkgList[pkgIndex]}`)
      }
      continue
    }

    await sleep(POLL_MS)
  }

  const focus = await getForeground(deviceId)
  const ui = await isLoginOrHome(deviceId, role)
  if (captureScreenshot) {
    await captureScreenshot(`${role}_app_not_ready`)
  }
  if (allowHbuilderSync && isStuckOnHbuilderBase(focus, ui)) {
    throw new Error(`${label}: ${HBUILDER_MANUAL_MSG} (focus=${focus.raw})`)
  }
  throw new Error(
    `${label}: ${timeoutMs / 1000}s 内未进入登录页/首页 (focus=${focus.raw}; ${log.join(' | ')})`
  )
}

module.exports = {
  STEP_WAIT_MS,
  TAKEOVER_WAIT_MS,
  HBUILDER_PKG,
  HBUILDER_MANUAL_MSG,
  listPackages,
  discoverClientPackage,
  discoverClientPackages,
  discoverDriverPackage,
  discoverDriverPackages,
  getForeground,
  isLoginOrHome,
  isStuckOnHbuilderBase,
  verifyTakeoverApp,
  ensureAppReady,
  forceLaunchApp
}
