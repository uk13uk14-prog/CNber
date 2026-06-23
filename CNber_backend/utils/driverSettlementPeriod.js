const { roundMoney } = require('./pricing')

function parseDateOnly(raw, label = '日期') {
  const s = String(raw || '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) {
    const e = new Error(`${label} 格式须为 YYYY-MM-DD`)
    e.code = 400
    throw e
  }
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (Number.isNaN(d.getTime())) {
    const e = new Error(`${label} 无效`)
    e.code = 400
    throw e
  }
  return d
}

function formatDateOnlyUTC(d) {
  const dt = d instanceof Date ? d : new Date(d)
  const y = dt.getUTCFullYear()
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const da = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function startOfDayUTC(d) {
  const dt = d instanceof Date ? d : parseDateOnly(d)
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0))
}

function endOfDayUTC(d) {
  const dt = d instanceof Date ? d : parseDateOnly(d)
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 23, 59, 59, 999))
}

function addDaysUTC(d, days) {
  const out = new Date(d.getTime())
  out.setUTCDate(out.getUTCDate() + days)
  return out
}

function buildPeriodLabel(startDate, endDate) {
  const s = formatDateOnlyUTC(startDate)
  const e = formatDateOnlyUTC(endDate)
  if (s === e) return s
  return `${s} ~ ${e}`
}

const ALLOWED_PERIOD_TYPES = ['daily', 'three_day', 'seven_day', 'fourteen_day', 'custom', 'monthly']

function normalizePeriodType(raw) {
  const t = String(raw || 'custom').trim().toLowerCase()
  if (!ALLOWED_PERIOD_TYPES.includes(t)) {
    const e = new Error('periodType 无效')
    e.code = 400
    throw e
  }
  return t
}

/** 解析生成/查询 body 中的结算周期 */
function parsePeriodInput(body = {}) {
  const periodType = normalizePeriodType(body.periodType)
  let startDate = body.startDate ? parseDateOnly(body.startDate, 'startDate') : null
  let endDate = body.endDate ? parseDateOnly(body.endDate, 'endDate') : null

  if (!startDate || !endDate) {
    const e = new Error('startDate 与 endDate 必填')
    e.code = 400
    throw e
  }

  if (endDate < startDate) {
    const e = new Error('endDate 不能早于 startDate')
    e.code = 400
    throw e
  }

  const start = startOfDayUTC(startDate)
  const end = endOfDayUTC(endDate)
  const periodLabel = buildPeriodLabel(start, end)

  return { periodType, startDate: start, endDate: end, periodLabel }
}

function todayUTC() {
  return startOfDayUTC(new Date())
}

function yesterdayUTC() {
  return startOfDayUTC(addDaysUTC(todayUTC(), -1))
}

/** 列表快捷筛选 → 查询区间 */
function resolveListDateRange(query = {}) {
  const quick = String(query.quick || query.range || '').trim().toLowerCase()
  const today = todayUTC()

  if (quick === 'today') {
    return { startDate: today, endDate: endOfDayUTC(today) }
  }
  if (quick === 'yesterday') {
    const y = yesterdayUTC()
    return { startDate: y, endDate: endOfDayUTC(y) }
  }
  if (quick === 'last3d' || quick === 'last_3d' || quick === '3d') {
    return { startDate: startOfDayUTC(addDaysUTC(today, -2)), endDate: endOfDayUTC(today) }
  }
  if (quick === 'last7d' || quick === '7d') {
    return { startDate: startOfDayUTC(addDaysUTC(today, -6)), endDate: endOfDayUTC(today) }
  }
  if (quick === 'last14d' || quick === '14d') {
    return { startDate: startOfDayUTC(addDaysUTC(today, -13)), endDate: endOfDayUTC(today) }
  }

  if (query.startDate && query.endDate) {
    return {
      startDate: startOfDayUTC(parseDateOnly(query.startDate, 'startDate')),
      endDate: endOfDayUTC(parseDateOnly(query.endDate, 'endDate'))
    }
  }

  // 默认最近 3 天
  return { startDate: startOfDayUTC(addDaysUTC(today, -2)), endDate: endOfDayUTC(today) }
}

module.exports = {
  ALLOWED_PERIOD_TYPES,
  parseDateOnly,
  formatDateOnlyUTC,
  startOfDayUTC,
  endOfDayUTC,
  addDaysUTC,
  buildPeriodLabel,
  parsePeriodInput,
  resolveListDateRange,
  todayUTC,
  roundMoney
}
