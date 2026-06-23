require('dotenv').config()
const http = require('http')
const mongoose = require('mongoose')
const User = require('../models/User')
const Driver = require('../models/Driver')
const Order = require('../models/Order')

const TARGET_PHONE = '13900000001'
const TARGET_ORDERS = [
  'CNB-20260622-001',
  'CNB-20260621-008',
  'CNB-20260621-007',
  'CNB-20260621-006'
]

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const r = http.request(
      {
        hostname: '127.0.0.1',
        port: 3100,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        }
      },
      (res) => {
        let buf = ''
        res.on('data', (c) => (buf += c))
        res.on('end', () => resolve({ status: res.statusCode, body: buf }))
      }
    )
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

function pickId(v) {
  if (!v) return null
  if (typeof v === 'object' && v._id) return String(v._id)
  return String(v)
}

async function findRelationModel() {
  const names = [
    'StaffDriverRelation',
    'DriverRelation',
    'DriverRelations',
    'driverrelations',
    'driver_relations'
  ]
  for (const name of names) {
    try {
      const M = require(`../models/${name}`)
      if (M) return { name, model: M }
    } catch (_) {}
  }
  // try registered mongoose models
  for (const key of Object.keys(mongoose.models)) {
    if (/relation/i.test(key) && /driver|staff/i.test(key)) {
      return { name: key, model: mongoose.models[key] }
    }
  }
  return { name: null, model: null }
}

function summarizeDriverApiRow(row, label) {
  if (!row) return null
  const userRef = row.userId
  return {
    source: label,
    _id: pickId(row._id),
    id: row.id ? String(row.id) : null,
    userId:
      typeof userRef === 'object'
        ? pickId(userRef)
        : userRef
          ? String(userRef)
          : row.userId
            ? String(row.userId)
            : null,
    driverDocId: row.driverDocId || null,
    phone: row.phone || (typeof userRef === 'object' ? userRef.phone : null),
    status: row.status,
    approvalStatus: row.approvalStatus || row.reviewStatus || row.verificationStatus,
    available: row.available,
    serviceStatus: row.serviceStatus,
    carPlate: row.carPlate || row.vehicle?.plateNo,
    relation: row.relation || null
  }
}

;(async () => {
  const mongoUrl =
    process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'
  await mongoose.connect(mongoUrl)

  console.log('========== 一、数据库对齐检查 ==========')

  const user = await User.findOne({ phone: TARGET_PHONE }).lean()
  console.log('\n--- 1. User (phone=13900000001) ---')
  if (!user) {
    console.log('NOT FOUND')
  } else {
    console.log(
      JSON.stringify(
        {
          _id: String(user._id),
          phone: user.phone,
          role: user.role,
          status: user.status,
          isActive: user.isActive,
          driverProfile: user.driverProfile
        },
        null,
        2
      )
    )
  }

  const driverByUser = user
    ? await Driver.findOne({ userId: user._id }).lean()
    : null
  const driverByPhone = await Driver.findOne({ phone: TARGET_PHONE }).lean()
  const driverDoc = driverByUser || driverByPhone

  console.log('\n--- 2. Driver (linked to user or phone) ---')
  if (!driverDoc) {
    console.log('NOT FOUND')
  } else {
    console.log(
      JSON.stringify(
        {
          _id: String(driverDoc._id),
          userId: driverDoc.userId ? String(driverDoc.userId) : null,
          phone: driverDoc.phone,
          status: driverDoc.status,
          verificationStatus: driverDoc.verificationStatus,
          available: driverDoc.available,
          serviceStatus: driverDoc.serviceStatus,
          carPlate: driverDoc.carPlate || driverDoc.vehiclePlate,
          carModel: driverDoc.vehicleModel,
          isActive: driverDoc.isActive
        },
        null,
        2
      )
    )
  }

  const { name: relModelName, model: RelationModel } = await findRelationModel()
  console.log('\n--- 3. DriverRelation model ---')
  console.log('model name:', relModelName || 'NOT FOUND')

  if (RelationModel && user) {
    const uid = String(user._id)
    const queries = [
      { driverUserId: user._id },
      { driverUserId: uid },
      { userId: user._id },
      { driverId: user._id },
      { driverId: driverDoc?._id }
    ]
    let relations = []
    for (const q of queries) {
      if (!q.driverId && !q.userId && !q.driverUserId) continue
      const rows = await RelationModel.find(q).lean()
      relations = relations.concat(rows)
    }
    // dedupe
    const seen = new Set()
    relations = relations.filter((r) => {
      const k = String(r._id)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    console.log('relation count:', relations.length)
    relations.forEach((r) =>
      console.log(
        JSON.stringify(
          {
            _id: String(r._id),
            staffId: r.staffId ? String(r.staffId) : null,
            driverUserId: r.driverUserId ? String(r.driverUserId) : null,
            layer: r.layer,
            relationScore: r.relationScore,
            note: r.note,
            updatedAt: r.updatedAt
          },
          null,
          2
        )
      )
    )
    if (!relations.length) {
      console.log('(no relation doc -> external tier in for-dispatch)')
    }
  }

  console.log('\n--- 4. Orders ---')
  for (const orderNo of TARGET_ORDERS) {
    const o = await Order.findOne({ orderNo }).lean()
    if (!o) {
      console.log(`\n${orderNo}: NOT FOUND`)
      continue
    }
    console.log(
      `\n${orderNo}:`,
      JSON.stringify(
        {
          _id: String(o._id),
          orderNo: o.orderNo,
          status: o.status,
          dispatchStatus: o.dispatchStatus,
          depositStatus: o.depositStatus,
          paymentStatus: o.paymentStatus,
          paidAmount: o.paidAmount,
          depositPaid: o.depositPaid,
          depositConfirmed: o.depositConfirmed,
          paymentStage: o.paymentStage,
          assignedDriver: pickId(o.assignedDriver),
          driverId: pickId(o.driverId),
          assignedDriverPhone: o.assignedDriverPhone,
          serviceType: o.serviceType,
          pickup: o.pickup,
          destination: o.destination,
          dropoff: o.dropoff
        },
        null,
        2
      )
    )
  }

  console.log('\n========== 二、接口返回检查 ==========')

  const login = await req('POST', '/api/auth/login', {
    phone: '13800000000',
    password: 'Admin123456'
  })
  const tok = JSON.parse(login.body).data.token

  const endpoints = [
    ['available', '/api/admin/drivers/available'],
    ['for-dispatch', '/api/admin/drivers/for-dispatch'],
    ['drivers', '/api/admin/drivers?page=1&pageSize=20'],
    ['orders', '/api/admin/orders?page=1&pageSize=20']
  ]

  const apiSummaries = {}
  for (const [label, path] of endpoints) {
    const res = await req('GET', path, null, tok)
    const parsed = JSON.parse(res.body)
    console.log(`\n--- GET ${path} HTTP ${res.status} ---`)
    const data = parsed.data
    let rows = []
    if (Array.isArray(data)) rows = data
    else if (Array.isArray(data?.drivers)) rows = data.drivers
    else if (Array.isArray(data?.items)) rows = data.items
    else if (Array.isArray(data?.orders)) rows = data.orders

    if (label === 'orders') {
      const subset = rows.filter((o) => TARGET_ORDERS.includes(o.orderNo))
      console.log(
        JSON.stringify(
          subset.map((o) => ({
            orderNo: o.orderNo,
            _id: o._id,
            status: o.status,
            dispatchStatus: o.dispatchStatus,
            depositStatus: o.depositStatus,
            depositPaid: o.depositPaid,
            paymentStatus: o.paymentStatus,
            driverId: pickId(o.driverId),
            assignedDriver: pickId(o.assignedDriver)
          })),
          null,
          2
        )
      )
    } else {
      const target = rows.find(
        (r) =>
          r.phone === TARGET_PHONE ||
          (typeof r.userId === 'object' && r.userId?.phone === TARGET_PHONE) ||
          r.userId === String(user?._id)
      )
      const summary = summarizeDriverApiRow(target, label)
      apiSummaries[label] = summary
      console.log(JSON.stringify(summary, null, 2))
      console.log('total rows:', rows.length)
    }
  }

  // assign-driver probe on target orders
  console.log('\n--- PATCH assign-driver probe ---')
  const driverUserId = user ? String(user._id) : null
  const driverDocId = driverDoc ? String(driverDoc._id) : null

  for (const orderNo of TARGET_ORDERS) {
    const o = await Order.findOne({ orderNo }).lean()
    if (!o) continue
    if (pickId(o.driverId)) {
      console.log(`${orderNo}: skip (already has driverId=${pickId(o.driverId)})`)
      continue
    }
    for (const [idLabel, idVal] of [
      ['User._id', driverUserId],
      ['Driver._id', driverDocId]
    ]) {
      if (!idVal) continue
      const res = await req(
        'PATCH',
        `/api/admin/orders/${o._id}/assign-driver`,
        { driverId: idVal },
        tok
      )
      const parsed = JSON.parse(res.body)
      console.log(
        `${orderNo} assign with ${idLabel}=${idVal.slice(-8)} -> HTTP ${res.status} message=${parsed.message}`
      )
      // unassign if succeeded to not mutate test orders permanently
      if (res.status === 200) {
        await req('PATCH', `/api/admin/orders/${o._id}/unassign-driver`, {}, tok)
        console.log(`  (rolled back unassign for ${orderNo})`)
      }
    }
  }

  // canDispatchByDeposit simulation
  console.log('\n--- deposit gate check (canDispatch logic) ---')
  const { canDispatchByDeposit } = require('../utils/orderPaymentFlow')
  for (const orderNo of TARGET_ORDERS) {
    const o = await Order.findOne({ orderNo }).lean()
    if (!o) continue
    console.log(
      `${orderNo}: depositStatus=${o.depositStatus} depositPaid=${o.depositPaid} paymentStage=${o.paymentStage} canDispatch=${canDispatchByDeposit(o)}`
    )
  }

  console.log('\n========== 三、ID 对齐摘要 ==========')
  console.log(
    JSON.stringify(
      {
        dbUserId: user ? String(user._id) : null,
        dbDriverDocId: driverDoc ? String(driverDoc._id) : null,
        apiAvailable: apiSummaries.available,
        apiForDispatch: apiSummaries.forDispatch,
        apiDriversList: apiSummaries.drivers
      },
      null,
      2
    )
  )

  await mongoose.disconnect()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
