/** 服务类型展示（与 Order.serviceType 对齐，默认 ride） */
export const SERVICE_TYPE_LABELS = {
  ride: '即时用车',
  pickup: '接机',
  dropoff: '送机',
  charter: '包车',
  point: '打点',
  default: '出行服务'
}

export function getServiceTypeLabel(code) {
  if (!code) return SERVICE_TYPE_LABELS.default
  return SERVICE_TYPE_LABELS[code] || code
}
