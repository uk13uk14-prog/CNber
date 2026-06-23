const {
  GBP_CNY_RATE_KEY,
  DEFAULT_GBP_CNY_RATE,
  getGbpCnyRate,
  setGbpCnyRate
} = require('../utils/exchangeRate')

exports.getExchangeRate = async (req, res) => {
  const rate = await getGbpCnyRate()
  res.json({
    code: 0,
    message: 'success',
    data: {
      key: GBP_CNY_RATE_KEY,
      rate,
      value: rate,
      defaultRate: DEFAULT_GBP_CNY_RATE
    }
  })
}

exports.putExchangeRate = async (req, res) => {
  const raw = req.body?.rate ?? req.body?.value
  const rate = await setGbpCnyRate(raw, req.user?.userId)
  res.json({
    code: 0,
    message: 'success',
    data: {
      key: GBP_CNY_RATE_KEY,
      rate,
      value: rate
    }
  })
}
