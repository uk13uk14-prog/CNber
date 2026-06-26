/** 服务类型展示（与 Order.serviceType 对齐，默认 ride） */
/** 与 Web 管理端 serviceType 文案一致 */
export const SERVICE_TYPE_LABELS = {
  ride: '普通用车',
  pickup: '接机',
  dropoff: '送机',
  charter: '包车',
  point: '点对点',
  default: '出行服务'
}

export function getServiceTypeLabel(code) {
  if (code == null || code === '') return SERVICE_TYPE_LABELS.default
  const k = String(code).trim().toLowerCase()
  return SERVICE_TYPE_LABELS[k] || SERVICE_TYPE_LABELS.default
}
