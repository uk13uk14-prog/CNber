/** 司机资料 status 展示 */
export const DRIVER_STATUS_LABELS = {
  pending: '待审核',
  approved: '已认证',
  online: '在线',
  offline: '离线',
  rejected: '已拒绝',
  banned: '已封禁'
}

export function getDriverStatusLabel(s) {
  return DRIVER_STATUS_LABELS[s] || s || '-'
}
