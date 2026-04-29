/**
 * 司机端订单状态中文（与后端 Order.status 一致；兼容进行中别名）
 */
const LABELS = {
  pending: '待指派',
  assigned: '已指派',
  accepted: '已接单',
  started: '行程中',
  ongoing: '行程中',
  in_progress: '行程中',
  completed: '已完成',
  cancelled: '已取消'
}

export function formatDriverOrderStatus(status) {
  if (!status) return '未知'
  return LABELS[status] || status
}
