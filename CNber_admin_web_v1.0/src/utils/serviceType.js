/** 与后端 PricingRule.SERVICE_TYPES / Order.serviceType 枚举一致 */

export const SERVICE_TYPE_OPTIONS = [
  { label: '普通用车', value: 'ride' },
  { label: '接机', value: 'pickup' },
  { label: '送机', value: 'dropoff' },
  { label: '包车', value: 'charter' },
  { label: '点对点', value: 'point' }
]

const SERVICE_TYPE_LABELS = Object.fromEntries(
  SERVICE_TYPE_OPTIONS.map(({ value, label }) => [value, label])
)

const KNOWN_VALUES = new Set(SERVICE_TYPE_OPTIONS.map((o) => o.value))

export function normalizeKnownServiceType(raw) {
  const s = String(raw ?? 'ride').trim()
  const lower = s.toLowerCase()
  if (KNOWN_VALUES.has(lower)) return lower
  return s || 'ride'
}

export function serviceTypeLabel(raw) {
  const key = String(raw || 'ride')
    .trim()
    .toLowerCase()
  if (SERVICE_TYPE_LABELS[key]) return SERVICE_TYPE_LABELS[key]
  if (!key) return '普通用车'
  return '其他类型'
}

export function serviceTypeSelectOptions(rule) {
  const cur = rule && rule.serviceType != null ? String(rule.serviceType).trim() : ''
  const lower = cur.toLowerCase()
  const isKnown = KNOWN_VALUES.has(lower)
  const opts = [...SERVICE_TYPE_OPTIONS]
  if (cur && !isKnown) {
    opts.unshift({ label: '其他类型', value: cur })
  }
  return opts
}

export { SERVICE_TYPE_LABELS }
