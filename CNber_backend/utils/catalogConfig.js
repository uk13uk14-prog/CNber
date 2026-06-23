const ServiceTypeConfig = require('../models/ServiceTypeConfig')
const VehicleClassConfig = require('../models/VehicleClassConfig')

const LEGACY_SERVICE_TYPES = ['point', 'pickup', 'dropoff', 'charter', 'ride']
const LEGACY_VEHICLE_CLASSES = [
  'standard_5',
  'luxury_5',
  'comfort_7',
  'luxury_7',
  'seater_8',
  'seater_9'
]

const LEGACY_SERVICE_LABELS = {
  point: '点对点',
  pickup: '接机',
  dropoff: '送机',
  charter: '包车',
  ride: '普通用车'
}

const LEGACY_VEHICLE_LABELS = {
  standard_5: '5座普通',
  luxury_5: '5座豪华',
  comfort_7: '7座舒适',
  luxury_7: '7座豪华',
  seater_8: '8座',
  seater_9: '9座'
}

let cache = {
  serviceTypes: null,
  vehicleClasses: null,
  at: 0
}
const TTL_MS = 60 * 1000

function invalidateCatalogCache() {
  cache = { serviceTypes: null, vehicleClasses: null, at: 0 }
}

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
}

async function refreshIfNeeded() {
  const now = Date.now()
  if (cache.serviceTypes && cache.vehicleClasses && now - cache.at < TTL_MS) return

  const [serviceTypes, vehicleClasses] = await Promise.all([
    ServiceTypeConfig.find().sort({ sortOrder: 1, code: 1 }).lean(),
    VehicleClassConfig.find().sort({ sortOrder: 1, code: 1 }).lean()
  ])

  cache = {
    serviceTypes,
    vehicleClasses,
    at: now
  }
}

async function getServiceTypeRows() {
  await refreshIfNeeded()
  return cache.serviceTypes || []
}

async function getVehicleClassRows() {
  await refreshIfNeeded()
  return cache.vehicleClasses || []
}

async function getServiceTypeMap() {
  const rows = await getServiceTypeRows()
  return Object.fromEntries(rows.map((r) => [r.code, r]))
}

async function getVehicleClassMap() {
  const rows = await getVehicleClassRows()
  return Object.fromEntries(rows.map((r) => [r.code, r]))
}

async function normalizeServiceType(serviceType) {
  const code = normalizeCode(serviceType || 'ride')
  if (!code) return 'ride'
  const map = await getServiceTypeMap()
  if (map[code]) return code
  if (LEGACY_SERVICE_TYPES.includes(code)) return code
  return 'ride'
}

async function normalizeVehicleClass(vehicleClass) {
  const code = normalizeCode(vehicleClass || 'standard_5')
  if (!code) return 'standard_5'
  const map = await getVehicleClassMap()
  if (map[code]) return code
  if (LEGACY_VEHICLE_CLASSES.includes(code)) return code
  return 'standard_5'
}

async function serviceLabelOf(code, fallback = '') {
  const key = normalizeCode(code)
  const map = await getServiceTypeMap()
  return map[key]?.label || LEGACY_SERVICE_LABELS[key] || fallback || key || '—'
}

async function vehicleLabelOf(code, fallback = '') {
  const key = normalizeCode(code)
  const map = await getVehicleClassMap()
  return map[key]?.label || LEGACY_VEHICLE_LABELS[key] || fallback || key || '—'
}

async function assertServiceTypeExists(code) {
  const key = normalizeCode(code)
  const map = await getServiceTypeMap()
  if (map[key]) return key
  if (LEGACY_SERVICE_TYPES.includes(key)) return key
  const e = new Error(`服务类型 ${key} 不存在，请先在服务类型管理中配置`)
  e.code = 400
  throw e
}

async function assertVehicleClassExists(code) {
  const key = normalizeCode(code)
  const map = await getVehicleClassMap()
  if (map[key]) return key
  if (LEGACY_VEHICLE_CLASSES.includes(key)) return key
  const e = new Error(`车型 ${key} 不存在，请先在车型管理中配置`)
  e.code = 400
  throw e
}

module.exports = {
  LEGACY_SERVICE_TYPES,
  LEGACY_VEHICLE_CLASSES,
  LEGACY_SERVICE_LABELS,
  LEGACY_VEHICLE_LABELS,
  invalidateCatalogCache,
  getServiceTypeRows,
  getVehicleClassRows,
  getServiceTypeMap,
  getVehicleClassMap,
  normalizeServiceType,
  normalizeVehicleClass,
  serviceLabelOf,
  vehicleLabelOf,
  assertServiceTypeExists,
  assertVehicleClassExists,
  normalizeCode
}
