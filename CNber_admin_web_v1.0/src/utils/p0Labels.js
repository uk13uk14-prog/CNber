export const EXCEPTION_LABELS = {
  cancelled_by_customer: '客户取消',
  cancelled_by_admin: '后台取消',
  driver_rejected: '司机拒单',
  driver_timeout: '司机超时',
  price_changed: '改价',
  refund_pending: '待退款',
  refunded: '已退款',
  dispute_open: '争议中',
  dispute_closed: '争议已关闭'
}

export const SERVICE_STATUS_LABELS = {
  active: '正常跟进',
  on_hold: '暂停',
  exception: '异常',
  dispute: '争议',
  closed: '已结案'
}

export const SETTLEMENT_LABELS = {
  unsettled: '未结算',
  partially_settled: '部分结算',
  settled: '已结算'
}

export const VERIFICATION_LABELS = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  suspended: '已停用'
}
