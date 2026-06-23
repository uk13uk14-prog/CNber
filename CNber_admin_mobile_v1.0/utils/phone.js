export function callPhone(phone) {
  const num = String(phone || '').trim()
  if (!num || num === '—') {
    uni.showToast({ title: '无可用号码', icon: 'none' })
    return
  }
  uni.makePhoneCall({ phoneNumber: num })
}

export function fmtTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN')
}

export function showToast(title, icon = 'none') {
  uni.showToast({ title: String(title || ''), icon, duration: 2000 })
}
