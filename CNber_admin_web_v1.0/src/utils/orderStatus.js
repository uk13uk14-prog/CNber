/**
 * 与乘客端 utils/orderStatus.js 对齐：cancelled 统一展示「已取消」，不进入完成态语义。
 */
const MAP = {
  pending: '待接单',
  assigned: '已指派（待司机确认）',
  accepted: '已接单',
  started: '行程中',
  completed: '已完成',
  cancelled: '已取消'
}

export function orderStatusLabel(s) {
  return MAP[s] || s || '—'
}
