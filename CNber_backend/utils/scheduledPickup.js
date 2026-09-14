const MS_24H = 24 * 60 * 60 * 1000
const LONDON_TZ = 'Europe/London'

const DATE_TIME_RE =
  /(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/

function pad2(n) {
  return String(n).padStart(2, '0')
}

/**
 * 将无时区的年月日时分解析为 Europe/London 墙上时间对应的绝对时刻。
 * 判断一律用后端 Date.now()，不用手机本地时间。
 */
function parseNaiveAsLondon(y, mo, d, h, mi, s) {
  const naive = `${y}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}:${pad2(s)}`
  const asUtc = Date.parse(`${naive}Z`)
  if (Number.isNaN(asUtc)) return null
  const londonStamp = new Date(asUtc)
    .toLocaleString('sv-SE', { timeZone: LONDON_TZ })
    .replace(' ', 'T')
  const londonAsUtc = Date.parse(`${londonStamp}Z`)
  if (Number.isNaN(londonAsUtc)) return null
  return new Date(asUtc - (londonAsUtc - asUtc))
}

function parseDateTimeText(text) {
  const m = String(text || '').match(DATE_TIME_RE)
  if (!m) return null
  return parseNaiveAsLondon(
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6] || 0)
  )
}

/**
 * 从请求体解析预约用车时间（优先 scheduledAt，其次 pickupDetail / dropoffDetail 文本）
 * @returns {Date|null}
 */
function parseScheduledAtFromBody(body = {}) {
  if (body.scheduledAt) {
    const d = new Date(body.scheduledAt)
    if (!Number.isNaN(d.getTime())) return d
  }
  for (const field of ['pickupDetail', 'dropoffDetail', 'pickup', 'destination']) {
    const parsed = parseDateTimeText(body[field])
    if (parsed) return parsed
  }
  return null
}

/**
 * 从已落库订单解析出发时间。优先 scheduledAt，其次详情文本。
 */
function parseOrderPickupAt(order = {}) {
  if (order.scheduledAt) {
    const d = new Date(order.scheduledAt)
    if (!Number.isNaN(d.getTime())) return d
  }
  return parseScheduledAtFromBody(order)
}

function hoursUntilPickup(order = {}, nowMs = Date.now()) {
  const pickupAt = parseOrderPickupAt(order)
  if (!pickupAt) return null
  return (pickupAt.getTime() - nowMs) / 36e5
}

function requiresCustomerApprovalForDriverCancel(order = {}, nowMs = Date.now()) {
  const pickupAt = parseOrderPickupAt(order)
  if (!pickupAt) return true
  return pickupAt.getTime() - nowMs < MS_24H
}

/**
 * 预约须至少提前 24 小时
 * @throws {Error} code 400
 */
function assertScheduledPickup24h(body = {}) {
  const scheduledAt = parseScheduledAtFromBody(body)
  if (!scheduledAt) {
    const e = new Error('请填写预约用车时间，且须至少提前 24 小时')
    e.code = 400
    throw e
  }
  if (scheduledAt.getTime() - Date.now() < MS_24H) {
    const e = new Error('请至少提前 24 小时预约用车')
    e.code = 400
    throw e
  }
  return scheduledAt
}

module.exports = {
  MS_24H,
  LONDON_TZ,
  parseScheduledAtFromBody,
  parseOrderPickupAt,
  hoursUntilPickup,
  requiresCustomerApprovalForDriverCancel,
  assertScheduledPickup24h
}
