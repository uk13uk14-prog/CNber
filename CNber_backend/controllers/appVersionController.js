const path = require('path')
const fs = require('fs')

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'appVersions.json')

function envPublicBaseUrl() {
  const raw = String(process.env.APP_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || '').trim()
  return raw.replace(/\/+$/, '')
}

function requestPublicBaseUrl(req) {
  if (!req || typeof req.get !== 'function') return ''
  const host = String(req.get('x-forwarded-host') || req.get('host') || '').trim()
  if (!host) return ''
  const lower = host.toLowerCase()
  if (lower.startsWith('127.0.0.1') || lower.startsWith('localhost')) return ''
  const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http')
    .split(',')[0]
    .trim()
  return `${proto}://${host}`
}

/** 单一对外根地址：优先客户端实际访问 Host，否则 APP_PUBLIC_BASE_URL / PUBLIC_BASE_URL */
function publicBaseUrl(req) {
  return requestPublicBaseUrl(req) || envPublicBaseUrl()
}

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
  return JSON.parse(raw)
}

function toPayload(appKey, entry, req) {
  const base = publicBaseUrl(req)
  const downloadUrl = entry.downloadUrl
    ? String(entry.downloadUrl)
    : `${base}/downloads/${String(entry.apkFile || '').replace(/^\/+/, '')}`
  return {
    versionName: entry.versionName,
    versionCode: Number(entry.versionCode),
    downloadUrl,
    forceUpdate: Boolean(entry.forceUpdate),
    releaseNotes: entry.releaseNotes || ''
  }
}

/** GET /api/app/version?app=driver|client */
exports.getAppVersion = async (req, res) => {
  const app = String(req.query.app || '').trim().toLowerCase()
  if (app !== 'driver' && app !== 'client') {
    return res.status(400).json({
      code: 400,
      message: 'app 参数必须是 driver 或 client',
      data: null
    })
  }
  const cfg = loadConfig()
  const entry = cfg[app]
  if (!entry) {
    return res.status(404).json({
      code: 404,
      message: '未配置该应用版本',
      data: null
    })
  }
  const payload = toPayload(app, entry, req)
  res.json({
    code: 0,
    message: 'success',
    data: payload,
    ...payload
  })
}
