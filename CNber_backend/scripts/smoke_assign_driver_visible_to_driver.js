#!/usr/bin/env node
/**
 * 派单后司机端可见性 smoke
 *
 * 用法:
 *   node scripts/smoke_assign_driver_visible_to_driver.js
 *   SMOKE_HOST=192.168.1.187 node scripts/smoke_assign_driver_visible_to_driver.js
 *
 * 测试账号（与 seedTestDriver.js / createTestAccounts.js 一致）:
 *   admin  13800000000 / Admin123456
 *   driver 13900000001 / 123456
 */
require('dotenv').config()
const http = require('http')

const HOST = process.env.SMOKE_HOST || '127.0.0.1'
const PORT = Number(process.env.SMOKE_PORT || 3100)
const ADMIN_PHONE = process.env.SMOKE_ADMIN_PHONE || '13800000000'
const ADMIN_PASS = process.env.SMOKE_ADMIN_PASS || 'Admin123456'
const DRIVER_PHONE = process.env.SMOKE_DRIVER_PHONE || '13900000001'
const DRIVER_PASS = process.env.SMOKE_DRIVER_PASS || '123456'

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : ''
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload)
    const r = http.request({ hostname: HOST, port: PORT, path, method, headers }, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        let json = null
        try {
          json = JSON.parse(d)
        } catch {
          /* plain */
        }
        resolve({ status: res.statusCode, json, raw: d })
      })
    })
    r.on('error', reject)
    if (payload) r.write(payload)
    r.end()
  })
}

async function login(phone, password) {
  const r = await req('POST', '/api/auth/login', { phone, password })
  if (r.json?.code !== 0 || !r.json?.data?.token) {
    throw new Error(`login failed ${phone}: ${r.json?.message || r.status}`)
  }
  return r.json.data
}

async function main() {
  console.log('=== smoke_assign_driver_visible_to_driver ===')

  const admin = await login(ADMIN_PHONE, ADMIN_PASS)
  const driver = await login(DRIVER_PHONE, DRIVER_PASS)
  const adminToken = admin.token
  const driverToken = driver.token
  const driverUserId = driver.user._id

  const ordersRes = await req(
    'GET',
    '/api/admin/orders?range=14d&page=1&pageSize=50',
    null,
    adminToken
  )
  const orders = ordersRes.json?.data?.orders || []
  let candidate =
    orders.find(
      (o) =>
        o.depositStatus === 'confirmed' &&
        !o.driverId &&
        !o.assignedDriver &&
        ['deposit_paid', 'pending', 'assigned'].includes(o.status)
    ) || orders.find((o) => o.depositStatus === 'confirmed' && !o.driverId && !o.assignedDriver)

  if (!candidate?._id) {
    console.log('SKIP: 无「定金已确认且未派单」订单')
    console.log('提示: 在 M1 运行 node scripts/_prepare_smoke_assign_order.js 后再试')
    process.exit(0)
  }

  const orderId = candidate._id
  console.log('Target order:', orderId, candidate.orderNo || '')

  const assignRes = await req(
    'PATCH',
    `/api/admin/orders/${orderId}/assign-driver`,
    { driverId: driverUserId },
    adminToken
  )
  if (assignRes.json?.code !== 0) {
    throw new Error(`assign failed: ${assignRes.json?.message || assignRes.status}`)
  }
  const assignedOrder = assignRes.json?.data?.order || {}
  console.log('OK assign-driver')
  console.log('Assign fields:', JSON.stringify({
    driverId: assignedOrder.driverId?._id || assignedOrder.driverId,
    assignedDriver: assignedOrder.assignedDriver?._id || assignedOrder.assignedDriver,
    assignedDriverPhone: assignedOrder.assignedDriverPhone,
    dispatchStatus: assignedOrder.dispatchStatus,
    status: assignedOrder.status
  }))

  const driverOrdersRes = await req('GET', '/api/driver/orders', null, driverToken)
  if (driverOrdersRes.json?.code !== 0) {
    throw new Error(`driver orders failed: ${driverOrdersRes.json?.message}`)
  }
  const driverOrders = driverOrdersRes.json?.data?.orders || []
  const found = driverOrders.find((o) => String(o._id) === String(orderId))

  if (!found) {
    console.error('FAIL: driver /api/driver/orders 未包含派单订单')
    console.error('driver orders count:', driverOrders.length)
    process.exit(1)
  }

  const assignedId = found.assignedDriver?._id || found.assignedDriver || found.driverId?._id || found.driverId
  if (String(assignedId) !== String(driverUserId)) {
    throw new Error(`assigned driver mismatch: ${assignedId} vs ${driverUserId}`)
  }

  console.log('PASS: driver sees assigned order', found.orderNo || found._id)
  console.log('--- smoke summary ---')
  console.log('driver login:', DRIVER_PHONE, '/', DRIVER_PASS)
  console.log('User._id:', driverUserId)
  console.log('driver/orders hit: status in [assigned, driver_accepted, ready_to_start, started, in_progress, ...]')
  console.log('  AND (driverId OR assignedDriver) = User._id')
  console.log('found order status:', found.status, 'dispatchStatus:', found.dispatchStatus)
  process.exit(0)
}

main().catch((e) => {
  console.error('FAIL:', e.message)
  process.exit(1)
})
