import { request } from './request.js'

const POLL_MS = 8000
const SEEN_KEY = 'driverSeenCancelDecisionIds'

let timer = null
let inFlight = false
let alerting = false

function hasToken() {
  try {
    return Boolean(uni.getStorageSync('token'))
  } catch {
    return false
  }
}

function isDriverLoggedIn() {
  try {
    const u = uni.getStorageSync('user')
    return hasToken() && u && u.role === 'driver'
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

async function pollOnce() {
  if (inFlight || alerting || !isDriverLoggedIn()) return
  inFlight = true
  try {
    const data = await request({
      url: '/order/cancellation-requests',
      method: 'GET',
      data: { status: 'rejected', driverAck: '0' },
      showErrorToast: false
    })
    const items = (data && data.requests) || []
    const seen = loadSeen()
    const next = items.find((row) => row && row.id && !seen.has(String(row.id)))
    if (!next) return
    seen.add(String(next.id))
    saveSeen(seen)
    alerting = true
    uni.showModal({
      title: '乘客未同意取消',
      content: '乘客未同意取消，请继续执行订单。',
      showCancel: false,
      success: async () => {
        try {
          await request({
            url: `/order/cancellation-requests/${encodeURIComponent(next.id)}/ack`,
            method: 'POST',
            showErrorToast: false
          })
        } catch {
          /* ignore */
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

export function startDriverCancelDecisionWatch() {
  if (timer) return
  pollOnce()
  timer = setInterval(pollOnce, POLL_MS)
}

export function stopDriverCancelDecisionWatch() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
