const http = require('http')

const HOST = process.env.DEMO_AGENT_HOST || process.env.E2E_HOST || '127.0.0.1'
const PORT = Number(process.env.DEMO_AGENT_PORT || process.env.E2E_PORT || 3100)
const PROOF_URL =
  process.env.SMOKE_PROOF_IMAGE_URL ||
  'https://placehold.co/600x400/png?text=cnber_demo_agent+proof'

function httpReq(method, apiPath, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : ''
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload)

    const req = http.request(
      { hostname: HOST, port: PORT, path: apiPath, method, headers },
      (res) => {
        let raw = ''
        res.on('data', (c) => {
          raw += c
        })
        res.on('end', () => {
          let json = null
          try {
            json = raw ? JSON.parse(raw) : null
          } catch {
            /* plain */
          }
          resolve({ status: res.statusCode, json, raw, api: apiPath, method })
        })
      }
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function checkBackendHealth() {
  const r = await httpReq('GET', '/api/status')
  if (r.json?.code !== 0 || !r.json?.data?.ok) {
    throw new Error('后端未就绪，请先启动 CNber_backend (npm start)')
  }
  return { host: HOST, port: PORT }
}

async function login(phone, password) {
  const r = await httpReq('POST', '/api/auth/login', { phone, password })
  if (r.json?.code !== 0 || !r.json?.data?.token) {
    throw new Error(r.json?.message || r.raw || 'login failed')
  }
  return r.json.data.token
}

function assertApiOk(r) {
  if (r.json?.code !== 0) {
    throw new Error(r.json?.message || r.raw || 'API error')
  }
  return r.json.data
}

async function fetchLatestCustomerOrder(token, { afterMs } = {}) {
  const r = await httpReq('GET', '/api/order/list', null, token)
  const data = assertApiOk(r)
  const list = Array.isArray(data.orders) ? data.orders : data.list || []
  const sorted = [...list].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  )
  if (afterMs) {
    const hit = sorted.find((o) => new Date(o.createdAt || 0).getTime() >= afterMs - 2000)
    if (!hit) throw new Error('未找到本次运行期间创建的订单')
    return hit
  }
  return sorted[0] || null
}

async function submitBalanceViaApi(orderId, token, paymentAccountId, orderNo, tag) {
  const detail = assertApiOk(await httpReq('GET', `/api/order/detail/${orderId}`, null, token))
  const order = detail.order
  const { paymentSummary } = require('../../utils/pricing')
  const balanceAmt = paymentSummary(order).balanceAmount

  const r = await httpReq(
    'POST',
    `/api/order/${orderId}/balance/submit`,
    {
      payerName: 'Demo Agent Customer',
      paidAmount: balanceAmt,
      proofImage: PROOF_URL,
      note: `${tag} balance ${orderNo}`,
      paymentAccountId,
      paymentMethod: 'wechat'
    },
    token
  )
  return assertApiOk(r).order
}

async function adminAdvanceAfterBalance(orderId, adminToken, tag) {
  await assertApiOk(
    await httpReq(
      'PATCH',
      `/api/admin/orders/${orderId}/payment/balance/confirm`,
      { paymentNote: `${tag} confirm balance` },
      adminToken
    )
  )
  await assertApiOk(
    await httpReq('POST', `/api/admin/orders/${orderId}/pay-remaining`, {}, adminToken)
  )
}

async function verifyOrderCompleted(orderId, customerToken, tag) {
  const data = assertApiOk(await httpReq('GET', `/api/order/detail/${orderId}`, null, customerToken))
  const order = data.order
  if (order.status !== 'completed') {
    throw new Error(`期望 completed，实际 ${order.status}`)
  }
  return order
}

async function getPaymentAccountId() {
  const PaymentAccount = require('../../models/PaymentAccount')
  const tag = 'cnber_demo_agent'
  const row =
    (await PaymentAccount.findOne({ displayName: `${tag} 微信收款` })) ||
    (await PaymentAccount.findOne({ displayName: `${tag} Wise 收款` }))
  return row?._id?.toString() || null
}

module.exports = {
  HOST,
  PORT,
  httpReq,
  checkBackendHealth,
  login,
  assertApiOk,
  fetchLatestCustomerOrder,
  submitBalanceViaApi,
  adminAdvanceAfterBalance,
  verifyOrderCompleted,
  getPaymentAccountId
}
