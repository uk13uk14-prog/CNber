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
  await new Promise((r) => setTimeout(r, 2500))

  const admin = await req('GET', '/admin/payment-settings', null, null)
  console.log('GET /admin/payment-settings (SPA) HTTP', admin.status)

  const login = await req('POST', '/api/auth/login', {
    phone: '13800000000',
    password: 'Admin123456'
  })
  const tok = JSON.parse(login.body).data.token
  const avail = await req('GET', '/api/admin/drivers/available', null, tok)
  const parsed = JSON.parse(avail.body)
  const rows = parsed.data || []
  console.log(
    'GET /api/admin/drivers/available HTTP',
    avail.status,
    'count=',
    rows.length,
    'phones=',
    rows.map((r) => r.phone).join(',')
  )

  const idx = await req('GET', '/admin/', null, null)
  console.log('GET /admin/ HTTP', idx.status)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
