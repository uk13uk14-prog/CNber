require('dotenv').config()
const http = require('http')

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

function pickDrivers(body) {
  const data = JSON.parse(body).data
  if (Array.isArray(data)) return data
  return data?.drivers || data?.items || []
}

;(async () => {
  const login = await req('POST', '/api/auth/login', {
    phone: '13800000000',
    password: 'Admin123456'
  })
  const tok = JSON.parse(login.body).data.token

  const fd = await req('GET', '/api/admin/drivers/for-dispatch', null, tok)
  console.log('=== for-dispatch sample ===')
  const fdData = JSON.parse(fd.body).data
  console.log(JSON.stringify({ drivers: (fdData.drivers || []).slice(0, 1), total: fdData.total }, null, 2))

  const avail = await req('GET', '/api/admin/drivers/available', null, tok)
  const drivers = pickDrivers(avail.body)
  const driverDocId = drivers[0]?.driverDocId || drivers[0]?._id
  const userId = drivers[0]?.userId || drivers[0]?.id || drivers[0]?._id
  console.log('driver userId=', userId, 'driverDocId=', driverDocId)

  const orders = await req('GET', '/api/admin/orders?page=1&pageSize=50', null, tok)
  const list = JSON.parse(orders.body).data.orders || []
  const target = list.find(
    (o) =>
      !o.driverId &&
      !o.assignedDriver &&
      (o.depositStatus === 'confirmed' || o.depositPaid === true) &&
      ['deposit_paid', 'pending', 'assigned'].includes(o.status)
  )
  if (!target) {
    console.log('no unassigned deposit-confirmed order; unassign one first if needed')
    const sample = list.find((o) => o.depositStatus === 'confirmed')
    console.log(
      'sample orders:',
      list.slice(0, 5).map((o) => ({
        id: o._id,
        status: o.status,
        depositStatus: o.depositStatus,
        driverId: o.driverId
      }))
    )
    return
  }

  const assignByDoc = await req(
    'PATCH',
    '/api/admin/orders/' + target._id + '/assign-driver',
    { driverId: driverDocId },
    tok
  )
  console.log('assign by Driver._id HTTP', assignByDoc.status)
  console.log(assignByDoc.body.slice(0, 600))

  const driverLogin = await req('POST', '/api/auth/login', {
    phone: '13900000001',
    password: '123456'
  })
  const dtok = JSON.parse(driverLogin.body).data.token
  const dorders = await req('GET', '/api/driver/orders', null, dtok)
  const assigned = JSON.parse(dorders.body).data.orders.find((o) => String(o._id) === String(target._id))
  console.log('driver sees assigned order:', assigned ? assigned.orderNo + ' ' + assigned.assignedDriverPhone : 'NO')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
