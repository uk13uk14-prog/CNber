/**
 * 收款码 URL 规范化：数据库只存 /uploads/... 相对路径，
 * 禁止把 127.0.0.1 / localhost / 局域网 IP / 本机绝对路径写入图片字段。
 */

function stripQuery(pathname) {
  return String(pathname || '').split('?')[0].split('#')[0]
}

function toStoredPaymentAssetPath(raw) {
  let u = String(raw || '').trim().replace(/\\/g, '/')
  if (!u) return ''

  if (/^[a-zA-Z]:\//.test(u) || u.startsWith('/Users/') || u.startsWith('/home/')) {
    return ''
  }

  if (/^https?:\/\//i.test(u)) {
    try {
      const parsed = new URL(u)
      u = parsed.pathname || ''
    } catch {
      return ''
    }
  }

  if (u.startsWith('//')) {
    const idx = u.indexOf('/', 2)
    u = idx >= 0 ? u.slice(idx) : ''
  }

  if (u.startsWith('/api/uploads/')) u = u.slice(4)
  if (u.startsWith('uploads/')) u = `/${u}`

  u = stripQuery(u)
  if (!u.startsWith('/uploads/')) return ''
  if (u.includes('..')) return ''
  return u
}

function publicHttpLink(raw) {
  const u = String(raw || '').trim()
  return /^https?:\/\//i.test(u) ? u : ''
}

module.exports = {
  toStoredPaymentAssetPath,
  publicHttpLink
}
