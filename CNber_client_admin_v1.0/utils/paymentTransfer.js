import { BASE_URL } from '../config/api.js'

function apiOriginFromConfig() {
  return String(BASE_URL || '').replace(/\/api\/?$/i, '')
}

/** 付款方式展示名 */
export function methodLabel(m) {
  const map = {
    bank: '银行转账',
    wise: 'Wise',
    revolut: 'Revolut',
    wechat: '微信',
    alipay: '支付宝',
    other: '其他'
  }
  return map[m] || m || '收款方式'
}

function accountType(a) {
  return a?.paymentType || a?.method || ''
}

function isEnabledAccount(a) {
  if (!a) return false
  if (a.enabled === false || a.isActive === false) return false
  return true
}

/** 接口实际字段：qrCodeUrl / qrImage / wechatQrImage / alipayQrImage（无 wechatQrUrl、qrUrl） */
export function resolvePaymentAssetUrl(urlOrPath) {
  const u = String(urlOrPath || '').trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith('//')) return `http:${u}`
  if (u.startsWith('/')) return `${apiOriginFromConfig()}${u}`
  return u
}

function pickRawQr(a, pt) {
  if (!a) return ''
  if (pt === 'wechat') {
    return (
      a.wechatQrImage ||
      a.wechatQrUrl ||
      a.qrUrl ||
      a.qrImage ||
      a.qrCodeUrl ||
      ''
    )
  }
  if (pt === 'alipay') {
    return (
      a.alipayQrImage ||
      a.alipayQrUrl ||
      a.qrUrl ||
      a.qrImage ||
      a.qrCodeUrl ||
      ''
    )
  }
  return a.qrImage || a.qrCodeUrl || a.qrUrl || ''
}

export function normalizeAccount(a) {
  if (!a) return null
  const pt = accountType(a)
  const qr = resolvePaymentAssetUrl(pickRawQr(a, pt))
  return {
    ...a,
    paymentType: pt,
    method: pt,
    accountNumber: a.accountNumber || a.accountNo || '',
    qrImage: qr,
    qrCodeUrl: qr,
    wechatQrImage: pt === 'wechat' ? qr : a.wechatQrImage || '',
    alipayQrImage: pt === 'alipay' ? qr : a.alipayQrImage || '',
    alipayUrl: a.alipayUrl || a.paymentLink || ''
  }
}

export function findWechatAccount(accounts) {
  const list = (accounts || []).map(normalizeAccount).filter(Boolean)
  return list.find((a) => isEnabledAccount(a) && accountType(a) === 'wechat') || null
}

export function findAlipayAccount(accounts) {
  const list = (accounts || []).map(normalizeAccount).filter(Boolean)
  return list.find((a) => isEnabledAccount(a) && accountType(a) === 'alipay') || null
}

export function getPaymentQr(account) {
  if (!account) return ''
  const a = normalizeAccount(account)
  const pt = accountType(a)
  const raw = pickRawQr(a, pt)
  return resolvePaymentAssetUrl(raw || a.qrImage || a.qrCodeUrl || '')
}

export function getAlipayUrl(account) {
  if (!account) return ''
  const a = normalizeAccount(account)
  return String(a.alipayUrl || a.paymentLink || '').trim()
}

export function qrForAccount(a) {
  return getPaymentQr(a)
}

export function bankCopyText(a, orderNo) {
  const lines = []
  if (a.bankName) lines.push(`银行：${a.bankName}`)
  if (a.accountName) lines.push(`户名：${a.accountName}`)
  if (a.sortCode) lines.push(`Sort Code：${a.sortCode}`)
  if (a.accountNumber) lines.push(`账号：${a.accountNumber}`)
  if (a.iban) lines.push(`IBAN：${a.iban}`)
  if (orderNo) lines.push(`备注/Reference：CNBER-${orderNo}`)
  if (a.note || a.instructions) lines.push(String(a.note || a.instructions))
  return lines.join('\n')
}

export function defaultTransferNote(orderNo, paymentMethod) {
  const ref = orderNo ? `CNBER-${orderNo}` : ''
  const via = paymentMethod ? `已通过 ${methodLabel(paymentMethod)} 转账` : '已完成转账'
  return ref ? `${via}，备注 ${ref}` : via
}

export function orderRefNote(orderNo) {
  return orderNo ? `CNBER-${orderNo}` : 'CNBER'
}
