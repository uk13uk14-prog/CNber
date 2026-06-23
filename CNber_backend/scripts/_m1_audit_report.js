require('dotenv').config()
const http = require('http')
const mongoose = require('mongoose')
const User = require('../models/User')
const Driver = require('../models/Driver')
const Order = require('../models/Order')
const StaffDriverRelation = require('../models/StaffDriverRelation')
const { canDispatchByDeposit } = require('../utils/orderPaymentFlow')

const PHONE = '13900000001'
const ORDER_NOS = ['CNB-20260622-001', 'CNB-20260621-008', 'CNB-20260621-007', 'CNB-20260621-006']
const FE_DISPATCHABLE = ['deposit_paid', 'pending', 'assigned']
const BE_DISPATCHABLE = ['pending', 'assigned', 'deposit_paid']

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const r = http.request(
      { hostname: '127.0.0.1', port: 3100, path, method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) } },
      (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve({ status: res.statusCode, body: b })) }
    )
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

function sid(v) {
  if (!v) return null
  if (typeof v === 'object' && v._id) return String(v._id)
  return String(v)
}

function pickDriverFields(row, source) {
  if (!row) return null
  const u = row.userId
  return {
    source,
    _id: sid(row._id),
    id: row.id != null ? String(row.id) : null,
    userId: typeof u === 'object' ? sid(u) : u ? String(u) : row.userId ? String(row.userId) : null,
    driverDocId: row.driverDocId || null,
    phone: row.phone || (typeof u === 'object' ? u.phone : null),
    label: row.label || null,
    status: row.status,
    approvalStatus: row.approvalStatus || row.reviewStatus || row.verificationStatus,
    available: row.available,
    serviceStatus: row.serviceStatus,
    relationLayer: row.relation?.layer || null
  }
}

function feHasDeposit(o) {
  if (o.depositStatus === 'confirmed') return true
  return Boolean(o.depositPaid || o.paymentStatus === 'paid')
}

function feDispatchable(o) {
  return FE_DISPATCHABLE.includes(o.status)
}

function beCanAssign(o) {
  if (!BE_DISPATCHABLE.includes(o.status)) return { ok: false, reason: `订单 status=${o.status} 不在后端可派单状态 [pending, assigned, deposit_paid]` }
  if (!canDispatchByDeposit(o)) return { ok: false, reason: `定金未确认 (depositStatus=${o.depositStatus}, paymentStage=${o.paymentStage || '—'}, payment.depositStatus=${o.payment?.depositStatus || '—'})` }
  return { ok: true, reason: '允许派单' }
}

;(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber')

  const user = await User.findOne({ phone: PHONE }).lean()
  const driver = user ? await Driver.findOne({ userId: user._id }).lean() : null
  const rel = user ? await StaffDriverRelation.findOne({ driverUserId: user._id }).lean() : null

  console.log('===SECTION1_DRIVER===')
  console.log(JSON.stringify({
    userId: sid(user?._id),
    driverDocId: sid(driver?._id),
    driverUserIdField: sid(driver?.userId),
    phone: user?.phone || driver?.phone,
    role: user?.role,
    userStatus: user?.status,
    driverStatus: driver?.status,
    approvalStatus: user?.driverProfile?.approvalStatus || driver?.verificationStatus,
    available: driver?.available,
    serviceStatus: driver?.serviceStatus,
    carPlate: driver?.carPlate || driver?.vehiclePlate || user?.driverProfile?.vehiclePlate,
    carModel: driver?.vehicleModel || user?.driverProfile?.vehicleModel,
    layer: rel?.layer || 'external(无关系文档时默认)',
    driverRelationExists: Boolean(rel),
    driverRelation: rel ? { _id: sid(rel._id), staffId: sid(rel.staffId), layer: rel.layer, relationScore: rel.relationScore } : null,
    userDriverProfileStatus: user?.driverProfile?.status
  }, null, 2))

  const login = await req('POST', '/api/auth/login', { phone: '13800000000', password: 'Admin123456' })
  const tok = JSON.parse(login.body).data.token

  console.log('===SECTION2_APIS===')
  const paths = [
    ['available', '/api/admin/drivers/available'],
    ['for-dispatch', '/api/admin/drivers/for-dispatch'],
    ['drivers', '/api/admin/drivers?page=1&pageSize=20'],
    ['orders', '/api/admin/orders?page=1&pageSize=20']
  ]
  for (const [name, path] of paths) {
    const res = await req('GET', path, null, tok)
    const parsed = JSON.parse(res.body)
    const data = parsed.data
    if (name === 'orders') {
      const subset = (data.orders || []).filter((o) => ORDER_NOS.includes(o.orderNo))
      console.log(name, JSON.stringify(subset.map((o) => ({
        orderNo: o.orderNo, _id: o._id, status: o.status, dispatchStatus: o.dispatchStatus,
        depositStatus: o.depositStatus, paymentStatus: o.paymentStatus, depositPaid: o.depositPaid,
        driverId: sid(o.driverId), assignedDriver: sid(o.assignedDriver)
      })), null, 2))
    } else {
      let rows = Array.isArray(data) ? data : data?.drivers || data?.items || []
      const hit = rows.find((r) => r.phone === PHONE || (typeof r.userId === 'object' && r.userId?.phone === PHONE))
      console.log(name, JSON.stringify(pickDriverFields(hit, name), null, 2), 'total=', rows.length)
    }
  }

  console.log('===SECTION5_ORDERS===')
  for (const no of ORDER_NOS) {
    const o = await Order.findOne({ orderNo: no }).lean()
    if (!o) { console.log(no, 'NOT_FOUND'); continue }
    const gate = beCanAssign(o)
    console.log(JSON.stringify({
      orderNo: no,
      _id: sid(o._id),
      status: o.status,
      dispatchStatus: o.dispatchStatus,
      depositStatus: o.depositStatus,
      paymentStatus: o.paymentStatus,
      paidAmount: o.paidAmount,
      depositPaid: o.depositPaid,
      depositConfirmed: o.depositStatus === 'confirmed' || o.payment?.depositStatus === 'confirmed',
      paymentStage: o.paymentStage,
      feHasDeposit: feHasDeposit(o),
      feDispatchable: feDispatchable(o),
      feUIEnabled: feHasDeposit(o) && feDispatchable(o),
      beAllowAssign: gate.ok,
      blockReason: gate.ok ? null : gate.reason
    }))
  }

  const uid = sid(user?._id)
  const active = ['assigned', 'accepted', 'driver_accepted', 'ready_to_start', 'started', 'in_progress']
  const holding = await Order.find({
    $or: [{ driverId: uid }, { assignedDriver: uid }],
    status: { $in: active }
  }).select('orderNo status dispatchStatus').lean()
  console.log('===SECTION_BUSY===')
  console.log(JSON.stringify({ driverUserId: uid, activeOrdersHoldingDriver: holding }, null, 2))

  const allOrders = await Order.find({}).select('status driverId assignedDriver orderNo').lean()
  const busyIds = new Set()
  for (const o of allOrders) {
    if (!active.includes(o.status)) continue
    const id = sid(o.driverId) || sid(o.assignedDriver)
    if (id) busyIds.add(id)
  }
  console.log('frontend_activeDriverIds', [...busyIds])
  console.log('driver_in_busy_set', busyIds.has(uid))

  await mongoose.disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
