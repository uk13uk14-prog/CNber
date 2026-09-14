/**
 * Client 车型 Picker — 复用接机/送机/包车成功流程，点对点单独 profile + 最多 3 次重试。
 *
 * 业务页差异（只读对照，不改业务）：
 * - 接机 A0102 / 送机 A0103 / 包车 A0105：class="picker vehicle-picker"
 * - 点对点 A0104：label「车型」+ class="address-input picker-like"（与日期/时间同类）
 */
const fs = require('fs')
const path = require('path')
const adb = require('../_shared/adb')
const ui = require('./mobileUi')
const { ensureReportsDir } = require('../_shared/paths')

const MAX_RETRIES = 2
const PLACEHOLDER = '请选择车型'

const VEHICLE_CANDIDATES = [
  '5座普通',
  '5座豪华',
  '7座舒适',
  '7座豪华',
  '8座',
  '9座',
  '奔驰 V Class',
  '舒适',
  '商务',
  'Comfort',
  'Business'
]

/** 成功流程模板：接机（送机/包车结构相同） */
const PROFILE_PICKUP = {
  id: 'pickup',
  pageMarker: 'A0102_client_order',
  sourceFlow: '接机 A0102 — picker.vehicle-picker',
  triggerVia: 'vehicle-picker_row',
  scrollBeforeOpen: false
}

const PROFILE_POINT = {
  id: 'point',
  pageMarker: 'A0104_client_order_point',
  sourceFlow: '接机 A0102 — picker.vehicle-picker + form.vehicle 内联 @change',
  triggerVia: 'vehicle-picker_row',
  scrollBeforeOpen: true
}

const PROFILES = {
  pickup: PROFILE_PICKUP,
  dropoff: { ...PROFILE_PICKUP, id: 'dropoff', pageMarker: 'A0103_client_order', sourceFlow: '送机 A0103' },
  charter: { ...PROFILE_PICKUP, id: 'charter', pageMarker: 'A0105_client_order', sourceFlow: '包车 A0105' },
  point: PROFILE_POINT
}

function decodeXml(s) {
  return String(s || '')
    .replace(/&#10;/g, '\n')
    .replace(/&amp;/g, '&')
}

function parseBounds(boundsStr) {
  const m = String(boundsStr || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/)
  if (!m) return null
  return {
    x: Math.round((Number(m[1]) + Number(m[3])) / 2),
    y: Math.round((Number(m[2]) + Number(m[4])) / 2),
    x1: Number(m[1]),
    y1: Number(m[2]),
    x2: Number(m[3]),
    y2: Number(m[4]),
    bounds: boundsStr
  }
}

function extractPageSection(xml, pageMarker) {
  const s = String(xml || '')
  const idx = s.indexOf(pageMarker)
  if (idx < 0) return s
  const next = s.slice(idx + pageMarker.length).search(/pages\/A\d/)
  const end = next >= 0 ? idx + pageMarker.length + next : idx + 20000
  return s.slice(idx, end)
}

function detectProfile(xml) {
  if (/A0104_client_order_point/.test(xml)) return PROFILES.point
  if (/A0103_client_order_dropoff/.test(xml)) return PROFILES.dropoff
  if (/A0105_client_order_charter/.test(xml)) return PROFILES.charter
  if (/A0102_client_order_pickup/.test(xml)) return PROFILES.pickup
  return PROFILES.pickup
}

/** 接机/送机/包车：在 page 片段内找最后一个「请选择车型」的可点击父节点 */
function findPickupStyleTrigger(sectionXml) {
  const re = /clickable="true"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"[^>]*>[\s\S]{0,400}?text="请选择车型"/g
  let last = null
  let m
  while ((m = re.exec(sectionXml))) {
    last = parseBounds(m[1])
    if (last) last.via = 'vehicle-picker_row'
  }
  if (last) return last

  const textRe = /text="请选择车型"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"/g
  while ((m = textRe.exec(sectionXml))) {
    last = parseBounds(m[1])
    if (last) last.via = 'text_请选择车型'
  }
  return last
}

/** 点对点：先找 label「车型」，再找紧随其后的 picker-like 可点击区（避免点到日期/时间） */
function findPointStyleTrigger(sectionXml) {
  const labelFirst = sectionXml.match(
    /text="车型"[^>]*bounds="[^"]*"[\s\S]{0,3000}?clickable="true"[^>]*bounds="(\[[^\]]+\]\[[^\]]+\])"[\s\S]{0,600}?text="请选择车型"/
  )
  if (labelFirst) {
    const node = parseBounds(labelFirst[1])
    if (node) {
      node.via = 'label_车型→clickable_picker-like'
      return node
    }
  }
  return findPickupStyleTrigger(sectionXml)
}

function findVehicleTrigger(xml, profile) {
  const section = extractPageSection(xml, profile.pageMarker)
  return findPickupStyleTrigger(section)
}

function readSelectedVehicleLabel(xml, profile) {
  const section = extractPageSection(xml, profile.pageMarker)
  if (/text="请选择车型"/.test(section)) return null
  const m = section.match(/text="(5座[^"]*|7座[^"]*|8座|9座|奔驰[^"]*)"/)
  return m ? m[1] : null
}

function isVehiclePickerOpen(xml) {
  return /content-desc="取消"/.test(xml) && /content-desc="完成"/.test(xml) && /5座普通/.test(xml)
}

function parsePickerOptions(xml) {
  const m = String(xml || '').match(/content-desc="([^"]*(?:5座|7座|8座|9座|奔驰)[^"]*)"/)
  if (!m) return []
  return decodeXml(m[1])
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)
}

function pickTargetOption(options) {
  for (const cand of VEHICLE_CANDIDATES) {
    const hit = options.find((o) => o.includes(cand))
    if (hit) return { label: hit, index: options.indexOf(hit) }
  }
  return options.length ? { label: options[0], index: 0 } : null
}

function canProceedAfterVehicle(xml, profile) {
  const selected = readSelectedVehicleLabel(xml, profile)
  if (selected) return { ok: true, selected }
  if (profile.id === 'point') {
    const section = extractPageSection(xml, profile.pageMarker)
    const hasSubmit = /text="下单"/.test(section)
    const noPlaceholder = !/text="请选择车型"/.test(section)
    if (noPlaceholder && hasSubmit) return { ok: true, selected: 'field_filled' }
  }
  return { ok: false, selected: null }
}

async function scrollVehicleFieldIntoView(deviceId, profile) {
  if (!profile.scrollBeforeOpen) return adb.dumpUi(deviceId)

  let xml = await adb.dumpUi(deviceId)
  for (let i = 0; i < 4; i++) {
    const section = extractPageSection(xml, profile.pageMarker)
    const trigger = findVehicleTrigger(xml, profile)
    if (trigger && trigger.y1 >= 1680) return xml
    await adb.swipe(deviceId, 540, 1500, 540, 900, 380)
    await ui.sleep(400)
    xml = await adb.dumpUi(deviceId)
  }
  return xml
}

async function ensurePointScheduleFilled(deviceId, xml) {
  const section = extractPageSection(xml, PROFILES.point.pageMarker)
  if (!/text="请选择日期"/.test(section) && !/text="请选择时间"/.test(section)) return xml

  if (/text="请选择日期"/.test(section)) {
    await ui.tapByAnyText(deviceId, ['请选择日期', '预约日期'], section)
    await ui.sleep(700)
    await ui.confirmNativePicker(deviceId, await adb.dumpUi(deviceId))
    await ui.sleep(400)
  }
  xml = await adb.dumpUi(deviceId)
  const section2 = extractPageSection(xml, PROFILES.point.pageMarker)
  if (/text="请选择时间"/.test(section2)) {
    await ui.tapByAnyText(deviceId, ['请选择时间', '预约时间'], section2)
    await ui.sleep(700)
    await ui.confirmNativePicker(deviceId, await adb.dumpUi(deviceId))
    await ui.sleep(400)
  }
  return adb.dumpUi(deviceId)
}

async function openPicker(deviceId, profile, xml) {
  const trigger = findVehicleTrigger(xml, profile)
  if (!trigger) {
    throw new Error(`${profile.id}: 未找到「${PLACEHOLDER}」触发区`)
  }
  await adb.tap(trigger.x, trigger.y, deviceId)
  await ui.sleep(900)
  const openXml = await adb.dumpUi(deviceId)
  if (!isVehiclePickerOpen(openXml)) {
    return { ok: false, trigger, reason: 'Picker 未打开', openXml }
  }
  return { ok: true, trigger, openXml }
}

const WHEEL_BOUNDS = { x1: 0, y1: 1572, x2: 1080, y2: 2118 }
const WHEEL_CENTER_X = 540
const WHEEL_SELECT_Y = 1890

/** 接机/送机/包车与点对点共用：原生滚轮选第 index 项后点「完成」 */
async function selectOnWheel(deviceId, targetIndex, openXml, artifactPrefix, attempt) {
  const options = parsePickerOptions(openXml)
  const target = pickTargetOption(options)
  const index = Math.max(1, target ? Math.min(target.index, options.length - 1) : targetIndex || 1)

  const dir = ensureReportsDir()
  fs.writeFileSync(path.join(dir, `${artifactPrefix}_picker_open_${attempt}.xml`), openXml, 'utf8')
  await adb.screencap(path.join(dir, `${artifactPrefix}_picker_open_${attempt}.png`), deviceId)

  await adb.tap(WHEEL_CENTER_X, WHEEL_SELECT_Y, deviceId)
  await ui.sleep(250)
  for (let i = 0; i < index; i++) {
    await adb.swipe(deviceId, WHEEL_CENTER_X, WHEEL_SELECT_Y + 100, WHEEL_CENTER_X, WHEEL_SELECT_Y - 100, 320)
    await ui.sleep(280)
  }
  await ui.sleep(400)

  let confirmXml = await adb.dumpUi(deviceId)
  let done = adb.findNodeByContentDesc(confirmXml, '完成', { partial: false })
  if (!done) {
    await ui.confirmNativePicker(deviceId, confirmXml)
  } else {
    await adb.tap(done.x, done.y, deviceId)
  }
  await ui.sleep(900)

  const selectedLabel = options[index] || options[0]
  return {
    ok: true,
    selected: selectedLabel,
    confirm: done
      ? { x: done.x, y: done.y, bounds: `[${done.x1},${done.y1}][${done.x2},${done.y2}]` }
      : { label: '完成' },
    options,
    wheelIndex: index,
    pickerOpenXml: path.join(dir, `${artifactPrefix}_picker_open_${attempt}.xml`)
  }
}

async function dumpArtifacts(deviceId, basename) {
  const dir = ensureReportsDir()
  const xmlPath = path.join(dir, `${basename}.xml`)
  const pngPath = path.join(dir, `${basename}.png`)
  const xml = await adb.dumpUi(deviceId)
  fs.writeFileSync(xmlPath, xml, 'utf8')
  await adb.screencap(pngPath, deviceId)
  return { xml, xmlPath, pngPath }
}

async function ensureOnPointOrderForm(deviceId) {
  let xml = await adb.dumpUi(deviceId)
  if (/A0104_client_order_point/.test(xml) && /text="请选择车型"/.test(extractPageSection(xml, PROFILES.point.pageMarker))) {
    return { ok: true, xml }
  }
  if (/A0101|请您选择/.test(xml)) {
    await ui.tapByAnyText(deviceId, ['128205', '点对点'], xml)
    await ui.sleep(2000)
    xml = await adb.dumpUi(deviceId)
  }
  const section = extractPageSection(xml, PROFILES.point.pageMarker)
  if (/A0104/.test(xml) && /text="请选择车型"/.test(section)) {
    return { ok: true, xml }
  }
  return { ok: false, reason: '请手动打开 Client → 点对点 → 创建订单（车型未选）' }
}

/**
 * @param {object} opts
 * @param {'point'|'pickup'|'dropoff'|'charter'} [opts.profile]
 */
async function selectVehicleType(deviceId, opts = {}) {
  const profile = opts.profile ? PROFILES[opts.profile] || PROFILES.pickup : null
  const prefix = opts.artifactPrefix || 'client_vehicle_ui'
  const attempts = []

  let xml
  let activeProfile = profile

  if (opts.profile === 'point') {
    const nav = await ensureOnPointOrderForm(deviceId)
    if (!nav.ok) {
      return { ok: false, reason: nav.reason, attempts, sourceFlow: PROFILES.point.sourceFlow }
    }
    xml = nav.xml
    activeProfile = PROFILES.point
  } else {
    xml = await adb.dumpUi(deviceId)
    activeProfile = profile || detectProfile(xml)
  }
  const existing = readSelectedVehicleLabel(xml, activeProfile)
  if (existing) {
    return {
      ok: true,
      selected: existing,
      sourceFlow: activeProfile.sourceFlow,
      profile: activeProfile.id,
      reason: '已选中'
    }
  }

  if (activeProfile.id === 'point') {
    xml = await ensurePointScheduleFilled(deviceId, xml)
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const snap = await dumpArtifacts(deviceId, `${prefix}_attempt_${attempt}`)
    attempts.push({ attempt, ...snap })

    try {
      xml = await scrollVehicleFieldIntoView(deviceId, activeProfile)
      const opened = await openPicker(deviceId, activeProfile, xml)
      if (!opened.ok) {
        attempts[attempts.length - 1].error = opened.reason
        continue
      }

      const wheel = await selectOnWheel(
        deviceId,
        1,
        opened.openXml,
        prefix,
        attempt
      )
      if (!wheel.ok) {
        attempts[attempts.length - 1].error = wheel.reason
        continue
      }

      const after = await dumpArtifacts(deviceId, `${prefix}_after_${attempt}`)
      const check = canProceedAfterVehicle(after.xml, activeProfile)

      attempts[attempts.length - 1].trigger = opened.trigger
      attempts[attempts.length - 1].wheel = wheel
      attempts[attempts.length - 1].after = after

      if (check.ok) {
        return {
          ok: true,
          profile: activeProfile.id,
          sourceFlow: activeProfile.sourceFlow,
          selected: check.selected,
          attempt,
          tap: {
            text: PLACEHOLDER,
            bounds: opened.trigger.bounds,
            x: opened.trigger.x,
            y: opened.trigger.y,
            via: opened.trigger.via
          },
          confirm: wheel.confirm,
          options: wheel.options,
          wheelIndex: wheel.wheelIndex,
          nextStep: activeProfile.id === 'point' ? '下单按钮可用' : 'submit',
          artifacts: {
            xml: after.xmlPath,
            png: after.pngPath,
            pickerXml: `${prefix}_attempt_${attempt}.xml`
          },
          attempts
        }
      }
      attempts[attempts.length - 1].error = '完成后面板关闭但车型未写入'
    } catch (err) {
      attempts[attempts.length - 1].error = err.message || String(err)
    }
  }

  return {
    ok: false,
    profile: activeProfile.id,
    sourceFlow: activeProfile.sourceFlow,
    reason: `点对点车型选择失败（已重试 ${MAX_RETRIES} 次）`,
    hint:
      activeProfile.id === 'point'
        ? '若仍失败：确认 A0104 onVehicleChange 使用 vehicleList.value[index]（commitVehicleSelection），并已重新同步/重装含该修复的 Client 包'
        : undefined,
    attempts
  }
}

module.exports = {
  MAX_RETRIES,
  VEHICLE_CANDIDATES,
  PROFILES,
  detectProfile,
  extractPageSection,
  findVehicleTrigger,
  findPickupStyleTrigger,
  findPointStyleTrigger,
  readSelectedVehicleLabel,
  isVehiclePickerOpen,
  parsePickerOptions,
  dumpArtifacts: dumpArtifacts,
  dumpVehicleArtifacts: dumpArtifacts,
  ensureOnPointOrderForm,
  selectVehicleType
}
