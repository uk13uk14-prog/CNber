const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const MAX_BYTES = 5 * 1024 * 1024
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'payment-proofs')

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

/**
 * @param {string} dataUrlOrBase64
 * @param {string} orderId
 * @returns {{ relativeUrl: string, absolutePath: string }}
 */
function savePaymentProofImage(dataUrlOrBase64, orderId) {
  ensureDir()
  let raw = String(dataUrlOrBase64 || '').trim()
  if (!raw) {
    const e = new Error('缺少图片数据')
    e.code = 400
    throw e
  }

  let ext = 'jpg'
  let b64 = raw
  const m = /^data:image\/(\w+);base64,(.+)$/i.exec(raw)
  if (m) {
    ext = m[1] === 'jpeg' ? 'jpg' : m[1]
    b64 = m[2]
  }

  const buf = Buffer.from(b64, 'base64')
  if (buf.length > MAX_BYTES) {
    const e = new Error('图片过大（最大 5MB）')
    e.code = 400
    throw e
  }

  const name = `${String(orderId)}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`
  const absolutePath = path.join(UPLOAD_DIR, name)
  fs.writeFileSync(absolutePath, buf)
  return {
    relativeUrl: `/uploads/payment-proofs/${name}`,
    absolutePath
  }
}

module.exports = {
  savePaymentProofImage,
  UPLOAD_DIR
}
