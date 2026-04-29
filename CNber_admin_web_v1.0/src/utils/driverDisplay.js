/** 与 CNber_backend Driver.status 枚举一致 */
const DRIVER_STATUS_LABELS = {
  pending: '待审核',
  approved: '已认证',
  rejected: '已拒绝',
  banned: '已封禁'
}

export function driverStatusLabel(s) {
  return DRIVER_STATUS_LABELS[s] || s || '—'
}
