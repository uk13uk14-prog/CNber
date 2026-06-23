/** Admin 车型等级 */

export const VEHICLE_OPTIONS = [
  { class: 'standard_5', label: '5座普通' },
  { class: 'luxury_5', label: '5座豪华' },
  { class: 'comfort_7', label: '7座舒适' },
  { class: 'luxury_7', label: '7座豪华' },
  { class: 'seater_8', label: '8座' },
  { class: 'seater_9', label: '9座' }
]

export const VEHICLE_LABELS = Object.fromEntries(
  VEHICLE_OPTIONS.map((o) => [o.class, o.label])
)

export function vehicleLabelOf(vehicleClass) {
  return VEHICLE_LABELS[vehicleClass] || vehicleClass || '—'
}
