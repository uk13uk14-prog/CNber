import { request } from './request.js'

const POLL_MS = 8000
const SEEN_KEY = 'clientSeenDriverCancelRequestIds'

let timer = null
let inFlight = false
let alerting = false

function isClientLoggedIn() {
  try {
    const token = uni.getStorageSync('token')
    const u = uni.getStorageSync('user')
    return Boolean(token) && u && u.role === 'user'
  } catch {
    return false
  }
}

function loadSeen() {
  try {
    const raw = uni.getStorageSync(SEEN_KEY)
    return new Set((Array.isArray(raw) ? raw : []).map((id) => String(id)))
  } catch {
    return new Set()
  }
}

function saveSeen(set) {
  try {
    uni.setStorageSync(SEEN_KEY, Array.from(set).slice(-200))
  } catch {
    /* ignore */
  }
}

function formatPickup(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

async function decide(id, approve) {
  const path = approve ? 'approve' : 'reject'
  return request({
    url: `/order/cancellation-requests/${encodeURIComponent(id)}/${path}`,
    method: 'POST'
  })
}

async function pollOnce() {
  if (inFlight || alerting || !isClientLoggedIn()) return
  inFlight = true
  try {
    const data = await request({
      url: '/order/cancellation-requests',
      method: 'GET',
      data: { status: 'pending' },
      showErrorToast: false
    })
    const items = (data && data.requests) || []
    const seen = loadSeen()
    const next = items.find((row) => row && row.id && !seen.has(String(row.id)))
    if (!next) return
    alerting = true
    const content = [
      `订单号 ${next.orderNo || '—'}`,
      `出发时间 ${formatPickup(next.pickupAt)}`,
      `出发地点 ${next.pickup || '—'}`,
      `目的地 ${next.destination || '—'}`,
      `司机取消原因 ${next.reason || '—'}${next.note ? `（${next.note}）` : ''}`
    ].join('\n')
    uni.showModal({
      title: '司机申请取消订单',
      content,
      cancelText: '不同意',
      confirmText: '同意取消',
      success: async (res) => {
        try {
          if (res.confirm) {
            await decide(next.id, true)
            uni.showToast({ title: '已同意取消', icon: 'success' })
          } else if (res.cancel) {
            await decide(next.id, false)
            uni.showToast({ title: '已拒绝取消', icon: 'none' })
          }
          seen.add(String(next.id))
          saveSeen(seen)
        } catch {
          /* request 已 toast */
        } finally {
          alerting = false
        }
      }
    })
  } catch {
    /* ignore */
  } finally {
    inFlight = false
  }
}

export function startClientCancelWatch() {
  if (timer) return
  pollOnce()
  timer = setInterval(pollOnce, POLL_MS)
}

export function stopClientCancelWatch() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

export function fetchPendingDriverCancellations() {
  return request({
    url: '/order/cancellation-requests',
    method: 'GET',
    data: { status: 'pending' }
  })
}

export { decide as decideDriverCancellation }
