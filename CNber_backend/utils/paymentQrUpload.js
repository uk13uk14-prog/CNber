const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const MAX_BYTES = 2 * 1024 * 1024
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'payment')
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

function sniffExt(buf, declared) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'png'
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg'
  }
  if (buf.length >= 6 && buf.slice(0, 6).toString('ascii') === 'GIF87a') return 'gif'
  if (buf.length >= 6 && buf.slice(0, 6).toString('ascii') === 'GIF89a') return 'gif'
  if (
    buf.length >= 12 &&
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp'
  }
  return declared
}

/**
 * @param {string} dataUrlOrBase64
 * @param {'wechat'|'alipay'} channel
 * @returns {{ relativeUrl: string }}
 */
function savePaymentQrImage(dataUrlOrBase64, channel) {
  ensureDir()
  const type = channel === 'alipay' ? 'alipay' : 'wechat'
  let raw = String(dataUrlOrBase64 || '').trim()
  if (!raw) {
    const e = new Error('缺少图片数据')
    e.code = 400
    throw e
  }

  let declared = 'jpg'
  let b64 = raw
  const m = /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/i.exec(raw)
  if (m) {
    declared = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase()
    b64 = m[2]
  } else if (/^[A-Za-z0-9+/=\s]+$/.test(raw)) {
    b64 = raw.replace(/\s/g, '')
  } else {
    const e = new Error('图片格式无效，请上传 jpg/png/webp')
    e.code = 400
    throw e
  }

  const buf = Buffer.from(b64, 'base64')
  if (!buf.length) {
    const e = new Error('图片数据为空')
    e.code = 400
    throw e
  }
  if (buf.length > MAX_BYTES) {
    const e = new Error('图片过大（最大 2MB）')
    e.code = 400
    throw e
  }

  const ext = sniffExt(buf, declared)
  if (!ALLOWED_EXT.has(ext)) {
    const e = new Error('只允许 jpg / png / webp / gif 图片')
    e.code = 400
    throw e
  }

  const name = `${type}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext === 'jpeg' ? 'jpg' : ext}`
  const absolutePath = path.join(UPLOAD_DIR, name)
  fs.writeFileSync(absolutePath, buf)
  return { relativeUrl: `/uploads/payment/${name}` }
}

module.exports = {
  savePaymentQrImage,
  UPLOAD_DIR,
  MAX_BYTES
}
