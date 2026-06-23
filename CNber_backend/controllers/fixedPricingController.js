const FixedPricingRule = require('../models/FixedPricingRule')
const ServiceTypeConfig = require('../models/ServiceTypeConfig')
const { getGbpCnyRate } = require('../utils/exchangeRate')
const { calculateFixedPrice, normalizeServiceType } = require('../utils/fixedPricing')
const { assertServiceTypeExists, serviceLabelOf } = require('../utils/catalogConfig')

exports.listFixedPricing = async (req, res) => {
  await FixedPricingRule.ensureDefaultRules()
  const exchangeRate = await getGbpCnyRate()
  const [configs, rules] = await Promise.all([
    ServiceTypeConfig.find({ enabled: true }).sort({ sortOrder: 1, code: 1 }).lean(),
    FixedPricingRule.find().lean()
  ])
  const ruleMap = Object.fromEntries(rules.map((r) => [r.serviceType, r]))
  const codes = configs.length
    ? configs.map((c) => c.code)
    : rules.map((r) => r.serviceType)

  const rows = []
  for (const code of codes) {
    const cfg = configs.find((c) => c.code === code)
    const rule = ruleMap[code]
    const merged = {
      serviceType: code,
      serviceLabel: cfg?.label || (await serviceLabelOf(code)),
      customerPriceCny: rule?.customerPriceCny ?? null,
      driverPriceGbp: rule?.driverPriceGbp ?? null,
      enabled: rule?.enabled !== false,
      remark: rule?.remark || '',
      _id: rule?._id
    }
    if (merged.customerPriceCny != null && merged.driverPriceGbp != null) {
      Object.assign(merged, calculateFixedPrice(code, exchangeRate, merged))
    }
    rows.push(merged)
  }

  res.json({
    code: 0,
    message: 'success',
    data: { rules: rows, exchangeRate }
  })
}

exports.updateFixedPricing = async (req, res) => {
  if (req.user?.role !== 'admin') {
    const e = new Error('仅管理员可修改固定报价')
    e.code = 403
    throw e
  }

  const serviceType = await assertServiceTypeExists(req.params.serviceType)
  const customerPriceCny = Number(req.body?.customerPriceCny)
  const driverPriceGbp = Number(req.body?.driverPriceGbp)
  const enabled = req.body?.enabled !== false
  const remark = String(req.body?.remark ?? '').trim()

  if (!Number.isFinite(customerPriceCny) || customerPriceCny <= 0) {
    const e = new Error('客户价 CNY 必须大于 0')
    e.code = 400
    throw e
  }
  if (!Number.isFinite(driverPriceGbp) || driverPriceGbp <= 0) {
    const e = new Error('司机价 GBP 必须大于 0')
    e.code = 400
    throw e
  }

  const rule = await FixedPricingRule.findOneAndUpdate(
    { serviceType },
    {
      $set: {
        serviceType,
        customerPriceCny,
        driverPriceGbp,
        enabled,
        remark,
        updatedBy: req.user?.userId || null
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()

  const exchangeRate = await getGbpCnyRate()
  res.json({
    code: 0,
    message: 'success',
    data: {
      rule: {
        ...rule,
        ...calculateFixedPrice(serviceType, exchangeRate, rule)
      },
      exchangeRate
    }
  })
}
