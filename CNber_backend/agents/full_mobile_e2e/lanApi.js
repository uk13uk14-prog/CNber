/**
 * 真机 E2E：局域网 API 检测、App .env 校验、Backend 可达性。
 */
const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const hxb = require('./hxb')

const BAD_HOST_PATTERNS = [
  /127\.0\.0\.1/i,
  /localhost/i,
  /10\.0\.2\.2/i
]

function detectLanIPv4() {
  if (process.env.E2E_LAN_IP) return process.env.E2E_LAN_IP.trim()

  const nets = os.networkInterfaces()
  const candidates = []
  for (const name of Object.keys(nets)) {
    if (/vmware|virtual|loopback|vbox|hyper-v|vethernet/i.test(name)) continue
    for (const net of nets[name] || []) {
      if (net.family !== 'IPv4' || net.internal) continue
      // RFC1918: 10/8, 172.16/12, 192.168/16（含 iPhone 热点 172.20.x）
      if (
        !net.address.startsWith('192.168.') &&
        !net.address.startsWith('10.') &&
        !/^172\.(1[6-9]|2\d|3[0-1])\./.test(net.address)
      ) {
        continue
      }
      candidates.push({ name, address: net.address })
    }
  }
  const wifi = candidates.find((c) => /wi-?fi|wlan|wireless/i.test(c.name))
  if (wifi) return wifi.address
  if (candidates.length) return candidates[0].address
  throw new Error('未检测到可用局域网 IPv4（192.168.x.x / 10.x.x.x），请设置 E2E_LAN_IP')
}

function readEnvApiUrl(projectPath) {
  const envPath = path.join(projectPath, '.env')
  if (!fs.existsSync(envPath)) return { path: envPath, exists: false, url: null, raw: '' }
  const raw = fs.readFileSync(envPath, 'utf8')
  const m = raw.match(/UNI_APP_API_BASE_URL\s*=\s*(\S+)/)
  return { path: envPath, exists: true, url: m ? m[1].trim() : null, raw }
}

function isBadMobileApiUrl(url) {
  if (!url) return true
  return BAD_HOST_PATTERNS.some((re) => re.test(url))
}

function buildLanApiUrl(lanIp, port = 3100) {
  return `http://${lanIp}:${port}/api`
}

function validateProjectEnv(projectPath, label) {
  const env = readEnvApiUrl(projectPath)
  const issues = []
  if (!env.exists) {
    issues.push(`${label}: 缺少 .env`)
    return { ok: false, env, issues }
  }
  if (!env.url) {
    issues.push(`${label}: .env 未设置 UNI_APP_API_BASE_URL`)
  } else if (isBadMobileApiUrl(env.url)) {
    issues.push(`${label}: API 仍为 localhost/127.0.0.1/10.0.2.2 → ${env.url}`)
  }
  return { ok: issues.length === 0, env, issues }
}

function httpGet(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let raw = ''
      res.on('data', (c) => {
        raw += c
      })
      res.on('end', () => resolve({ status: res.statusCode, raw }))
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })
  })
}

async function checkBackendLanReachable(lanIp, port = 3100) {
  const url = `http://${lanIp}:${port}/api/status`
  try {
    const res = await httpGet(url)
    const json = JSON.parse(res.raw || '{}')
    if (json.code === 0 && json.data?.ok) return { ok: true, url }
    return { ok: false, url, detail: res.raw?.slice(0, 200) }
  } catch (err) {
    return { ok: false, url, detail: err.message }
  }
}

function checkBackendBindHint(port = 3100) {
  try {
    const out = execFileSync('netstat', ['-ano'], { encoding: 'utf8', timeout: 8000 })
    const lines = String(out || '')
      .split('\n')
      .filter((l) => l.includes(`:${port}`) && /LISTENING/i.test(l))
    const allIf = lines.some((l) => l.includes('0.0.0.0') || l.includes('[::]') || l.includes('*:3100'))
    return { listening: lines.length > 0, allInterfaces: allIf, lines: lines.map((l) => l.trim()).slice(0, 5) }
  } catch {
    return { listening: null, allInterfaces: null, lines: [] }
  }
}

function checkFirewallHint(port = 3100) {
  try {
    const out = execFileSync('netsh', ['advfirewall', 'firewall', 'show', 'rule', 'name=all'], {
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 20 * 1024 * 1024
    })
    const hasPortRule = new RegExp(`LocalPort\\s*:\\s*${port}`, 'i').test(out)
    return { checked: true, hasPortRule, hint: hasPortRule ? 'ok' : `请允许 Windows 防火墙 TCP ${port} 入站（手机与电脑需同一 Wi-Fi）` }
  } catch {
    return {
      checked: false,
      hasPortRule: null,
      hint: `请确认 Windows 防火墙允许 TCP ${port} 入站，且手机与电脑在同一 Wi-Fi`
    }
  }
}

async function validatePhysicalEnvironment(launchPlan = { client: 'sync', driver: 'sync' }) {
  const lanIp = detectLanIPv4()
  const port = Number(process.env.E2E_PORT || process.env.DEMO_AGENT_PORT || 3100)
  const expectedApi = buildLanApiUrl(lanIp, port)

  const allTakeover =
    launchPlan.client === 'takeover' && launchPlan.driver === 'takeover'

  let clientEnv = { env: {}, issues: [], ok: true }
  let driverEnv = { env: {}, issues: [], ok: true }
  const envIssues = []

  if (!allTakeover) {
    clientEnv = validateProjectEnv(hxb.CLIENT_PROJECT, 'Client')
    driverEnv = validateProjectEnv(hxb.DRIVER_PROJECT, 'Driver')
    if (clientEnv.issues.length) envIssues.push(...clientEnv.issues)
    if (driverEnv.issues.length) envIssues.push(...driverEnv.issues)

    const apkSideBad =
      (launchPlan.client === 'apk' && clientEnv.issues.length > 0) ||
      (launchPlan.driver === 'apk' && driverEnv.issues.length > 0)

    if (apkSideBad) {
      throw new Error(
        `${envIssues.join('; ')}。APK 模式请重新打包并设置 UNI_APP_API_BASE_URL=${expectedApi}。`
      )
    }

    if (envIssues.length && launchPlan.client !== 'sync' && launchPlan.driver !== 'sync') {
      throw new Error(
        `${envIssues.join('; ')}。真机请使用局域网 IP，例如 UNI_APP_API_BASE_URL=${expectedApi}。`
      )
    }
  }

  const backendLan = await checkBackendLanReachable(lanIp, port)
  if (!backendLan.ok) {
    throw new Error(
      `Backend 无法通过局域网访问: ${backendLan.url} (${backendLan.detail})。` +
        `请确保 npm start 已运行且监听 0.0.0.0:${port}，手机与电脑同一 Wi-Fi。`
    )
  }

  const bind = checkBackendBindHint(port)
  const firewall = checkFirewallHint(port)

  return {
    lanIp,
    port,
    backendLanApi: expectedApi,
    backendLanStatusUrl: backendLan.url,
    clientEnvUrl: clientEnv.env.url,
    driverEnvUrl: driverEnv.env.url,
    envIssues,
    bind,
    firewall
  }
}

module.exports = {
  detectLanIPv4,
  buildLanApiUrl,
  isBadMobileApiUrl,
  validateProjectEnv,
  checkBackendLanReachable,
  checkBackendBindHint,
  checkFirewallHint,
  validatePhysicalEnvironment
}
