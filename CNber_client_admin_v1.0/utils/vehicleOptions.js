import { request } from './request.js'

let cachedVehicles = null

/** 启用车型（公开接口） */
export async function fetchEnabledVehicleClasses() {
  const data = await request({
    url: '/catalog/vehicle-classes',
    method: 'GET'
  })
  return Array.isArray(data?.items) ? data.items : []
}

export async function loadVehicleOptions(force = false) {
  if (!force && cachedVehicles?.length) {
    return cachedVehicles.map((o) => o.label)
  }
  try {
    const items = await fetchEnabledVehicleClasses()
    if (items.length) {
      cachedVehicles = items.map((row) => ({
        class: row.code,
        label: row.label,
        seats: row.seats
      }))
      return cachedVehicles.map((o) => o.label)
    }
  } catch (e) {
    /* fallback below */
  }
  cachedVehicles = FALLBACK_VEHICLES
  return cachedVehicles.map((o) => o.label)
}

export function getVehicleOptionRows() {
  return cachedVehicles || FALLBACK_VEHICLES
}

const FALLBACK_VEHICLES = [
  { class: 'standard_5', label: '5座普通' },
  { class: 'luxury_5', label: '5座豪华' },
  { class: 'comfort_7', label: '7座舒适' },
  { class: 'luxury_7', label: '7座豪华' },
  { class: 'seater_8', label: '8座' },
  { class: 'seater_9', label: '9座' }
]

export function vehicleLabelOf(vehicleClass, fallback = '5座普通') {
  const rows = getVehicleOptionRows()
  const found = rows.find((o) => o.class === vehicleClass)
  return found?.label || fallback
}

export function vehicleClassFromLabel(label) {
  const rows = getVehicleOptionRows()
  const found = rows.find((o) => o.label === label)
  return found ? found.class : 'standard_5'
}

/**
 * Picker @change 提交：把 detail.value（index）落到 label。
 * 调用方必须传入已解包的 labels 数组（vehicleList.value），不可传 ref 本身。
 */
export function commitVehicleSelection(labels, rawIndex) {
  const list = Array.isArray(labels) ? labels : []
  const index = Number(rawIndex)
  if (!list.length || !Number.isFinite(index) || index < 0 || index >= list.length) {
    return { index: 0, label: '', vehicleClass: 'standard_5' }
  }
  const label = String(list[index] || '')
  return {
    index,
    label,
    vehicleClass: vehicleClassFromLabel(label)
  }
}

/** @deprecated 使用 loadVehicleOptions */
export const VEHICLE_OPTIONS = FALLBACK_VEHICLES
