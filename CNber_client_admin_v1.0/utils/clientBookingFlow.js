/**
 * CNber V1 预约用车 — 客户端统一展示层（不暴露开发字段）
 */
import { normalizeOrderStatus } from './orderStatus.js'

const MS_24H = 24 * 60 * 60 * 1000

/** 支付展示：待付款 / 付款待确认 / 已付款 */
export function clientV1PaymentLabel(order) {
  if (!order) return '—'
  if (normalizeOrderStatus(order.status) === 'cancelled') return '—'

  const dep = order.depositStatus || order.payment?.depositStatus || ''
  const stage = order.paymentStage || ''
  const paidConfirmed =
    dep === 'confirmed' ||
    stage === 'deposit_confirmed' ||
    stage === 'balance_confirmed' ||
    order.paymentStatus === 'paid' ||
    (order.depositPaid && (!stage || stage === 'none' || stage === 'deposit_confirmed'))

  if (paidConfirmed) return '已付款'
  if (
    dep === 'submitted' ||
    dep === 'pending' ||
    stage === 'deposit_submitted' ||
    order.paymentStatus === 'manual_review'
  ) {
    return '付款待确认'
  }
  return '待付款'
}

function paymentConfirmed(order) {
  return clientV1PaymentLabel(order) === '已付款'
}

function paymentPendingReview(order) {
  return clientV1PaymentLabel(order) === '付款待确认'
}

/**
 * V1 主状态文案（7+1）
 */
export function clientV1BookingStatusLabel(order) {
  if (!order) return '—'
  const n = normalizeOrderStatus(order.status)

  if (n === 'cancelled') return '已取消'
  if (n === 'completed') return '已完成'
  if (['started', 'in_progress', 'arrived'].includes(n)) return '行程中'
  if (['accepted', 'driver_accepted', 'ready_to_start'].includes(n)) return '待出发'
  if (n === 'assigned') return '司机已安排'
  if (paymentPendingReview(order)) return '付款待确认'
  if (paymentConfirmed(order) && ['deposit_paid', 'confirmed', 'pending', 'created', 'quoted'].includes(n)) {
    return '已付款，平台安排司机中'
  }
  if (paymentConfirmed(order)) return '已付款，平台安排司机中'
  return '待付款'
}

export function clientV1PageTitle(order) {
  return clientV1BookingStatusLabel(order)
}

export function clientV1WaitingHint(order) {
  const label = clientV1BookingStatusLabel(order)
  const map = {
    待付款: '报价已生成，请完成付款后平台将为您安排司机。',
    付款待确认: '我们已收到您的付款信息，平台核对到账后将安排司机。',
    '已付款，平台安排司机中': '平台正在为您安排司机，请保持手机畅通。',
    司机已安排: '司机信息已确定，请按预约时间候车。',
    待出发: '请按预约时间在上车点候车，司机会提前与您联系。',
    行程中: '行程进行中，请系好安全带。',
    已完成: '感谢您的使用，欢迎再次预约。',
    已取消: '该订单已取消，可在订单历史中查看。'
  }
  return map[label] || '请留意订单状态更新。'
}

/** 主操作按钮 */
export function clientV1PrimaryAction(order) {
  if (!order?._id) return null
  const n = normalizeOrderStatus(order.status)
  if (n === 'cancelled' || n === 'completed') return null

  const payLabel = clientV1PaymentLabel(order)
  if (payLabel === '待付款' && ['created', 'quoted', 'confirmed', 'pending'].includes(n)) {
    return { type: 'pay', label: '立即付款' }
  }
  if (payLabel === '付款待确认') {
    return { type: 'hint', label: '付款待确认' }
  }
  if (payLabel === '已付款' && ['deposit_paid', 'confirmed', 'quoted', 'created', 'pending'].includes(n)) {
    return { type: 'hint', label: '平台正在安排司机' }
  }
  if (n === 'assigned') {
    return { type: 'hint', label: '司机已安排' }
  }
  if (['accepted', 'driver_accepted', 'ready_to_start'].includes(n)) {
    return { type: 'hint', label: '请按预约时间候车' }
  }
  if (['started', 'in_progress', 'arrived'].includes(n)) {
    return { type: 'hint', label: '行程进行中' }
  }
  return null
}

export function clientV1ShowDriverCard(order) {
  if (!order?.driverId) return false
  const n = normalizeOrderStatus(order.status)
  return ['assigned', 'accepted', 'driver_accepted', 'ready_to_start', 'started', 'in_progress', 'arrived'].includes(n)
}

export function clientV1DriverSummary(order) {
  if (!order?.driverId) return '平台安排司机中'
  const phone = order.driverId?.phone || order.assignedDriverPhone || ''
  if (phone) return `司机（尾号 ${String(phone).slice(-4)}）`
  return '司机已安排'
}

/** 24 小时预约校验（客户端） */
export function validateScheduledAt24h(scheduledAt) {
  const d = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt)
  if (Number.isNaN(d.getTime())) {
    return { ok: false, message: '请选择有效的预约时间' }
  }
  if (d.getTime() - Date.now() < MS_24H) {
    return { ok: false, message: '请至少提前 24 小时预约用车' }
  }
  return { ok: true, scheduledAt: d }
}

export function buildScheduledAtIso(dateStr, timeStr) {
  const date = String(dateStr || '').trim()
  const time = String(timeStr || '').trim()
  if (!date || !time) return ''
  const normalized = time.length === 5 ? `${time}:00` : time
  return `${date}T${normalized}`
}
