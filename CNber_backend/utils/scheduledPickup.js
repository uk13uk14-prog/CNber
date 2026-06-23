const MS_24H = 24 * 60 * 60 * 1000

const DATE_TIME_RE =
  /(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/

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
    const text = String(body[field] || '')
    const m = text.match(DATE_TIME_RE)
    if (m) {
      const d = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6] || 0)
      )
      if (!Number.isNaN(d.getTime())) return d
    }
  }
  return null
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
  parseScheduledAtFromBody,
  assertScheduledPickup24h
}
