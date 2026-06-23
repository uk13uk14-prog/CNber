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

export function serviceTypeLabel(raw) {
  const key = String(raw || 'ride').trim().toLowerCase()
  return SERVICE_TYPE_LABELS[key] || '其他类型'
}
