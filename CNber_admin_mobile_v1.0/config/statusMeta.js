import { adminBookingStatusLabel } from '@/utils/bookingStatus'
import { ticketStatusLabel } from '@/utils/supportTicketLabels'

const TONES = {
  primary: { color: '#1677ff', bg: '#eff8ff' },
  success: { color: '#12b76a', bg: '#ecfdf3' },
  warning: { color: '#f79009', bg: '#fffaeb' },
  danger: { color: '#f04438', bg: '#fef3f2' },
  default: { color: '#667085', bg: '#f2f4f7' }
}

const BOOKING_TONE = {
  待付款: 'warning',
  付款待确认: 'warning',
  '已付款，待派单': 'primary',
  已派单: 'primary',
  待出发: 'primary',
  行程中: 'success',
  已完成: 'success',
  已取消: 'danger'
}

const TICKET_TONE = {
  pending: 'warning',
  in_progress: 'primary',
  resolved: 'success',
  closed: 'default'
}

export function getBookingStatusMeta(order) {
  const label = adminBookingStatusLabel(order)
  const tone = BOOKING_TONE[label] || 'default'
  return { label, ...TONES[tone] }
}

export function getTicketStatusMeta(status) {
  const label = ticketStatusLabel(status)
  const tone = TICKET_TONE[status] || 'default'
  return { label, ...TONES[tone] }
}
