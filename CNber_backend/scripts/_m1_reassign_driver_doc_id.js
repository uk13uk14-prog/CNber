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
  const orderId = '6a386205970548c1cac480a1'
  const driverDocId = '6a38700c09e204ddebed142d'

  const un = await req('PATCH', '/api/admin/orders/' + orderId + '/unassign-driver', {}, tok)
  console.log('unassign HTTP', un.status, un.body.slice(0, 200))

  const assign = await req(
    'PATCH',
    '/api/admin/orders/' + orderId + '/assign-driver',
    { driverId: driverDocId },
    tok
  )
  console.log('assign by Driver._id HTTP', assign.status)
  const parsed = JSON.parse(assign.body)
  console.log(
    'order assignedDriverPhone=',
    parsed.data?.order?.assignedDriverPhone,
    'dispatchStatus=',
    parsed.data?.order?.dispatchStatus
  )

  const driverLogin = await req('POST', '/api/auth/login', {
    phone: '13900000001',
    password: '123456'
  })
  const dtok = JSON.parse(driverLogin.body).data.token
  const dorders = await req('GET', '/api/driver/orders', null, dtok)
  const hit = JSON.parse(dorders.body).data.orders.find((o) => String(o._id) === orderId)
  console.log('driver order visible:', hit ? `${hit.orderNo} phone=${hit.assignedDriverPhone}` : 'NO')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
