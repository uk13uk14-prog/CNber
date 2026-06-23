import { orderStatusLabel } from './orderStatus'

export function depositConfirmedForDispatch(order) {
  if (!order) return false
  if (order.payment?.depositStatus === 'confirmed') return true
  if (order.depositStatus === 'confirmed') return true
  if (!order.paymentStage || order.paymentStage === 'none') {
    return Boolean(order.depositPaid)
  }
  return false
}

export function depositSubmittedPendingConfirm(order) {
  if (!order) return false
  if (order.depositStatus === 'submitted') return true
  if (order.paymentStage === 'deposit_submitted') return true
  return false
}

export function depositDisplayLabel(order) {
  if (!order) return '—'
  if (depositConfirmedForDispatch(order)) return '定金已确认'
  if (depositSubmittedPendingConfirm(order)) return '定金已提交，待确认'
  const dep = order.depositStatus || 'unpaid'
  if (dep === 'rejected') return '定金已驳回'
  if (order.depositPaid && dep === 'unpaid') return '定金待人工复核'
  if (dep === 'unpaid') return '定金未提交'
  return '定金待确认'
}

export function orderStatusDisplayLabel(status, order) {
  if (status === 'deposit_paid' && order && !depositConfirmedForDispatch(order)) {
    if (depositSubmittedPendingConfirm(order)) return '定金待确认'
    return '待确认订金'
  }
  return orderStatusLabel(status)
}

export function paymentSummaryLabel(order) {
  if (!order) return '—'
  if (order.remainingPaid || (order.paymentStatus === 'paid' && depositConfirmedForDispatch(order))) {
    return '尾款已付（订金+尾款已结清）'
  }
  if (depositConfirmedForDispatch(order)) return '定金已确认，待付尾款'
  if (depositSubmittedPendingConfirm(order)) return '定金已提交，待 admin 确认'
  if (order.paymentStatus === 'partial' || order.paymentStatus === 'manual_review') {
    return '支付待人工复核'
  }
  if (order.paymentStatus === 'pending') return '待支付'
  return '未支付'
}
