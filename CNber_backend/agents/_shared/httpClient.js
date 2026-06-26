const http = require('http')

function httpGet(apiPath, { host, port, token } = {}) {
  const hostname = host || process.env.AGENT_HOST || process.env.DEMO_AGENT_HOST || '127.0.0.1'
  const portNum = Number(port || process.env.AGENT_PORT || process.env.DEMO_AGENT_PORT || 3100)

  return new Promise((resolve, reject) => {
    const headers = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const req = http.request(
      { hostname, port: portNum, path: apiPath, method: 'GET', headers },
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
            /* plain text */
          }
          resolve({ status: res.statusCode, json, raw, api: apiPath })
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

module.exports = { httpGet }
