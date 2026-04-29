/**
 * 时间、金额等展示
 */

export function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`
}

export function formatDateTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`
}

export function formatMoney(amount, currency = '') {
  if (amount == null || amount === '') return '-'
  const n = Number(amount)
  if (Number.isNaN(n)) return '-'
  const s = n.toFixed(2)
  return currency ? `${currency} ${s}` : s
}

export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '-'
  if (phone.length <= 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}
