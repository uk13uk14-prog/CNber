function normalizePostcode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = require('https').get(url, (response) => {
      let body = ''

      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () => {
        try {
          resolve({
            statusCode: response.statusCode,
            body: body ? JSON.parse(body) : null
          })
        } catch (error) {
          reject(error)
        }
      })
    })

    request.setTimeout(8000, () => {
      request.destroy(new Error('Postcodes.io 请求超时'))
    })
    request.on('error', reject)
  })
}

async function lookupPostcode(postcode) {
  const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`
  const { statusCode, body } = await getJson(url)

  if (statusCode === 404 || body?.status === 404 || !body?.result) {
    return null
  }

  if (statusCode < 200 || statusCode >= 300 || body.status !== 200) {
    const e = new Error('邮编查询失败，请稍后重试')
    e.code = 502
    throw e
  }

  return body.result
}

async function searchPostcodeAddresses(postcode) {
  const apiKey = process.env.IDEAL_POSTCODES_API_KEY
  if (!apiKey) {
    const e = new Error('地址列表服务未配置')
    e.code = 503
    throw e
  }

  const url = `https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(postcode)}?api_key=${encodeURIComponent(apiKey)}`
  const { statusCode, body } = await getJson(url)

  if (statusCode === 404 || body?.code === 4040 || !Array.isArray(body?.result)) {
    return []
  }

  if (statusCode < 200 || statusCode >= 300 || body.code !== 2000) {
    const e = new Error(body?.message || '地址列表查询失败，请稍后重试')
    e.code = 502
    throw e
  }

  return body.result.map((item) => ({
    line1: item.line_1 || item.line1 || '',
    line2: item.line_2 || item.line2 || '',
    street: item.thoroughfare || item.street || '',
    postTown: item.post_town || item.postTown || '',
    postcode: item.postcode || postcode,
    longitude: item.longitude,
    latitude: item.latitude
  }))
}

exports.lookup = async (req, res) => {
  const postcode = normalizePostcode(req.query.postcode)
  if (!postcode) {
    const e = new Error('请输入邮编')
    e.code = 400
    throw e
  }

  const result = await lookupPostcode(postcode)
  if (!result) {
    return res.status(404).json({
      code: 404,
      message: '邮编不存在，请检查后重新输入'
    })
  }

  res.json({
    code: 0,
    message: 'success',
    data: {
      postcode: result.postcode || postcode,
      city: result.admin_district || result.parliamentary_constituency || '',
      region: result.region,
      country: result.country,
      longitude: result.longitude,
      latitude: result.latitude,
      outcode: result.outcode
    }
  })
}

exports.search = async (req, res) => {
  const postcode = normalizePostcode(req.query.postcode)
  if (!postcode) {
    const e = new Error('请输入邮编')
    e.code = 400
    throw e
  }

  const addresses = await searchPostcodeAddresses(postcode)
  res.json({
    code: 0,
    message: 'success',
    data: addresses
  })
}
