const MAP = {
  created: '下单完成',
  quoted: '已自动报价',
  confirmed: '客户确认报价',
  deposit_paid: '已付订金',
  assigned: '已指派司机',
  driver_accepted: '司机已接单',
  ready_to_start: '待出发',
  in_progress: '行程中',
  arrived: '已到达',
  completed: '已完成',
  cancelled: '已取消',
  pending: '待处理',
  accepted: '司机已接单',
  started: '行程中'
}

export function orderStatusLabel(s) {
  return MAP[s] || s || '—'
}
