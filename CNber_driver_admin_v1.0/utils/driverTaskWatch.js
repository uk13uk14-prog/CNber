import { getDriverDashboard, getDriverOrders } from './driverApi.js'
import { formatCny, customerOrderAmountCny, settlementDisplayText } from './driverCurrencyDisplay.js'

const FOREGROUND_MS = 8000
const BACKGROUND_MS = 30000
const SEEN_KEY = 'driverSeenAssignmentKeys'
const SOUND_WWW = '_www/static/sounds/new_order.wav'
const SOUND_UNI = '/static/sounds/new_order.wav'

let timer = null
let inFlight = false
let foreground = true
let alerting = false
let audioPlayer = null
let audioCtx = null

function diag(tag, extra) {
  const msg = extra == null || extra === '' ? tag : `${tag} ${extra}`
  console.log(msg)
}

async function requestNotifyPermission() {
  try {
    if (typeof plus === 'undefined' || !plus.android) return
    plus.android.requestPermissions(
      ['android.permission.POST_NOTIFICATIONS'],
      () => {},
      () => {}
    )
  } catch {
    /* ignore */
  }
}

function readUser() {
  try {
    return uni.getStorageSync('user') || null
  } catch {
    return null
  }
}

function hasToken() {
  try {
    return Boolean(uni.getStorageSync('token'))
  } catch {
    return false
  }
}

function isDriverLoggedIn() {
  const u = readUser()
  return hasToken() && u && u.role === 'driver'
}

function isDriverOnline() {
  const u = readUser()
  const status = String(u?.driverProfile?.status || '').toLowerCase()
  if (status === 'offline') return false
  return true
}

function loadSeen() {
  try {
    const raw = uni.getStorageSync(SEEN_KEY)
    const list = Array.isArray(raw) ? raw : []
    return new Set(list.map((id) => String(id)))
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

function orderIdOf(order) {
  return order && order._id != null ? String(order._id) : ''
}

function assignmentKey(order) {
  const id = orderIdOf(order)
  if (!id) return ''
  const assignedAt = order.assignedAt ? String(order.assignedAt) : ''
  return `${id}::${assignedAt}`
}

function isNewAssignedTask(order) {
  const ds = String(order.dispatchStatus || '').trim()
  const st = String(order.status || '').trim()
  return ds === 'assigned' || st === 'assigned'
}

function resolveSoundSrc() {
  try {
    if (typeof plus !== 'undefined' && plus.io && plus.io.convertLocalFileSystemURL) {
      const converted = plus.io.convertLocalFileSystemURL(SOUND_WWW)
      if (converted) return converted
    }
  } catch {
    /* ignore */
  }
  return SOUND_UNI
}

function playInnerAudioFallback(asset) {
  try {
    if (!audioCtx) {
      audioCtx = uni.createInnerAudioContext()
      audioCtx.autoplay = false
    }
    audioCtx.src = asset || SOUND_UNI
    audioCtx.stop()
    audioCtx.seek(0)
    audioCtx.onError((err) => {
      diag('[DRIVER_ALERT_SOUND]', `success/fail=fail inner ${err && (err.errMsg || err.message) || 'error'}`)
    })
    audioCtx.play()
    diag('[DRIVER_ALERT_SOUND]', 'success/fail=play-called-inner')
  } catch (e) {
    diag('[DRIVER_ALERT_SOUND]', `success/fail=fail ${e && e.message}`)
  }
}

function playAlertSound() {
  const asset = resolveSoundSrc()
  diag('[DRIVER_ALERT_SOUND]', `start asset=${asset}`)
  try {
    if (typeof plus !== 'undefined' && plus.audio && typeof plus.audio.createPlayer === 'function') {
      if (audioPlayer) {
        try {
          audioPlayer.stop()
          audioPlayer.close()
        } catch {
          /* ignore */
        }
        audioPlayer = null
      }
      audioPlayer = plus.audio.createPlayer(SOUND_WWW)
      audioPlayer.addEventListener('play', () => {
        diag('[DRIVER_ALERT_SOUND]', 'success/fail=success')
      })
      audioPlayer.addEventListener('error', (err) => {
        diag('[DRIVER_ALERT_SOUND]', `success/fail=fail plus.audio ${err && (err.message || err.code) || 'error'}`)
        playInnerAudioFallback(asset)
      })
      audioPlayer.play()
      return
    }
  } catch (e) {
    diag('[DRIVER_ALERT_SOUND]', `success/fail=fail ${e && e.message}`)
  }
  playInnerAudioFallback(asset)
}

function vibratePhone() {
  try {
    if (typeof plus !== 'undefined' && plus.device && typeof plus.device.vibrate === 'function') {
      plus.device.vibrate(500)
    }
    uni.vibrateLong({
      success() {
        diag('[DRIVER_VIBRATE]', 'success/fail=success')
      },
      fail(err) {
        diag('[DRIVER_VIBRATE]', `success/fail=fail ${err && err.errMsg}`)
      }
    })
  } catch (e) {
    diag('[DRIVER_VIBRATE]', `success/fail=fail ${e && e.message}`)
  }
}

function sendLocalNotification(order) {
  try {
    if (typeof plus === 'undefined' || !plus.push || typeof plus.push.createMessage !== 'function') {
      return
    }
    plus.push.createMessage(
      `订单 ${order.orderNo || ''} ${order.pickup || ''} → ${order.destination || ''}`,
      JSON.stringify({ orderId: orderIdOf(order) }),
      { title: '您有新的订单', cover: false }
    )
  } catch {
    /* ignore */
  }
}

function showNewOrderModal(order) {
  if (alerting) return
  alerting = true
  const no = order.orderNo || orderIdOf(order).slice(-6)
  const orderAmt = customerOrderAmountCny(order)
  const settle = settlementDisplayText(order)
  const content = [
    `订单号：${no}`,
    order.pickup || '—',
    '↓',
    order.destination || '—',
    `订单金额：${orderAmt != null ? formatCny(orderAmt) : '待确认'}`,
    `司机结算：${settle}`
  ]
    .filter((line) => line !== '')
    .join('\n')
  uni.showModal({
    title: '您有新的订单！',
    content,
    confirmText: '立即查看',
    cancelText: '稍后查看',
    success: (res) => {
      alerting = false
      if (res.confirm) {
        uni.navigateTo({
          url: `/pages/D0102_driver_order_detail?id=${orderIdOf(order)}`
        })
      }
    },
    fail: () => {
      alerting = false
    }
  })
}

function alertNewOrder(order) {
  playAlertSound()
  vibratePhone()
  sendLocalNotification(order)
  showNewOrderModal(order)
}

export function ingestDriverOrders(orders, { alertNew = true } = {}) {
  const list = Array.isArray(orders) ? orders : []
  uni.$emit('driver-orders-updated', list)
  const seen = loadSeen()
  const assigned = list.filter(isNewAssignedTask)
  diag('[DRIVER_TASK_POLL]', `orderIds=${list.map(orderIdOf).filter(Boolean).join(',')}`)

  if (alertNew) {
    for (const order of assigned) {
      const key = assignmentKey(order)
      if (!key) continue
      if (seen.has(key)) continue
      diag('[DRIVER_NEW_ORDER]', `orderId=${orderIdOf(order)} key=${key}`)
      seen.add(key)
      saveSeen(seen)
      alertNewOrder(order)
      break
    }
  }

  assigned.forEach((order) => {
    const key = assignmentKey(order)
    if (key) seen.add(key)
  })
  saveSeen(seen)
  return list
}

async function pollOnce() {
  if (inFlight) return
  if (!isDriverLoggedIn() || !isDriverOnline()) return
  inFlight = true
  try {
    const data = await getDriverOrders()
    ingestDriverOrders(Array.isArray(data?.orders) ? data.orders : [])
  } catch {
    /* request 内已提示，避免叠加弹窗 */
  } finally {
    inFlight = false
  }
}

function clearTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function armTimer() {
  clearTimer()
  if (!isDriverLoggedIn()) return
  const ms = foreground ? FOREGROUND_MS : BACKGROUND_MS
  timer = setInterval(() => {
    pollOnce()
  }, ms)
}

export async function startDriverTaskWatch({ immediate = true } = {}) {
  foreground = true
  if (!isDriverLoggedIn()) return
  try {
    const dash = await getDriverDashboard()
    const u = readUser() || {}
    u.driverProfile = {
      ...(u.driverProfile || {}),
      status: dash.status || u.driverProfile?.status || 'offline'
    }
    uni.setStorageSync('user', u)
  } catch {
    /* ignore */
  }
  armTimer()
  requestNotifyPermission()
  if (immediate) await pollOnce()
}

export function pauseDriverTaskWatch() {
  foreground = false
  armTimer()
}

export function stopDriverTaskWatch() {
  clearTimer()
}

export function markDriverOnlineLocal(status) {
  try {
    const u = readUser() || {}
    u.driverProfile = { ...(u.driverProfile || {}), status }
    uni.setStorageSync('user', u)
  } catch {
    /* ignore */
  }
  if (status === 'online') {
    startDriverTaskWatch({ immediate: true })
  } else {
    stopDriverTaskWatch()
  }
}
