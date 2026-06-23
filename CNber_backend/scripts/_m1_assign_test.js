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

;(async () => {
  const login = await req('POST', '/api/auth/login', {
    phone: '13800000000',
    password: 'Admin123456'
  })
  const tok = JSON.parse(login.body).data.token
  const avail = await req('GET', '/api/admin/drivers/available', null, tok)
  const availBody = JSON.parse(avail.body)
  const drivers = Array.isArray(availBody.data)
    ? availBody.data
    : availBody.data?.drivers || availBody.data?.items || []
  console.log(
    'available count=',
    drivers.length,
    'phones=',
    drivers.map((d) => d.phone).join(',')
  )
  const orders = await req(
    'GET',
    '/api/admin/orders?page=1&pageSize=20&quick=pending_dispatch',
    null,
    tok
  )
  const list = JSON.parse(orders.body).data.orders || []
  const target =
    list.find((o) => o.depositStatus === 'confirmed' && !o.driverId) ||
    list.find((o) => o.depositPaid && !o.driverId) ||
    list[0]
  if (!target) {
    console.log('no pending dispatch order')
    return
  }
  const driverId = drivers[0]?.userId || drivers[0]?.id || drivers[0]?._id
  if (!driverId) {
    console.log('no driver')
    return
  }
  const assign = await req(
    'PATCH',
    '/api/admin/orders/' + target._id + '/assign-driver',
    { driverId },
    tok
  )
  console.log(
    'assign order',
    String(target._id),
    'driver',
    String(driverId),
    'HTTP',
    assign.status
  )
  console.log(assign.body.slice(0, 500))
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
