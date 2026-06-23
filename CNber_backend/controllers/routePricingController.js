const mongoose = require('mongoose')
const RoutePricingRule = require('../models/RoutePricingRule')
const { getGbpCnyRate } = require('../utils/exchangeRate')
const {
  normalizeLocationKey,
  normalizeVehicleClass,
  normalizeVehicleClassSync,
  vehicleLabelOf,
  calculateRoutePrice
} = require('../utils/routePricing')
const { normalizeServiceType } = require('../utils/fixedPricing')
const {
  assertServiceTypeExists,
  assertVehicleClassExists,
  normalizeCode
} = require('../utils/catalogConfig')

function buildRouteQuery(q = {}) {
  const query = {}
  if (q.serviceType) query.serviceType = normalizeServiceType(q.serviceType)
  if (q.vehicleClass) query.vehicleClass = normalizeVehicleClassSync(q.vehicleClass)
  if (q.enabled === 'true' || q.enabled === '1') query.enabled = true
  if (q.enabled === 'false' || q.enabled === '0') query.enabled = false
  const search = String(q.search || q.q || '').trim()
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [
      { fromLabel: re },
      { toLabel: re },
      { fromKey: re },
      { toKey: re },
      { remark: re }
    ]
  }
  return query
}

exports.listRoutePricing = async (req, res) => {
  const query = buildRouteQuery(req.query)
  const exchangeRate = await getGbpCnyRate()
  const rules = await RoutePricingRule.find(query).sort({ updatedAt: -1 }).lean()
  const rows = await Promise.all(
    rules.map(async (rule) => {
      const priced = await calculateRoutePrice({
        serviceType: rule.serviceType,
        from: rule.fromLabel,
        to: rule.toLabel,
        vehicleClass: rule.vehicleClass,
        exchangeRate
      })
      return { ...rule, ...priced, enabled: rule.enabled }
    })
  )
  res.json({
    code: 0,
    message: 'success',
    data: { rules: rows, exchangeRate }
  })
}

exports.createRoutePricing = async (req, res) => {
  if (req.user?.role !== 'admin') {
    const e = new Error('仅管理员可新增路线报价')
    e.code = 403
    throw e
  }
  const body = req.body || {}
  const serviceType = await assertServiceTypeExists(body.serviceType)
  const fromLabel = String(body.fromLabel || '').trim()
  const toLabel = String(body.toLabel || '').trim()
  const vehicleClass = await assertVehicleClassExists(body.vehicleClass)
  const customerPriceCny = Number(body.customerPriceCny)
  const driverPriceGbp = Number(body.driverPriceGbp)
  const enabled = body.enabled !== false
  const remark = String(body.remark ?? '').trim()

  if (!fromLabel || !toLabel) {
    const e = new Error('请填写起点和终点')
    e.code = 400
    throw e
  }
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

  const fromKey = normalizeLocationKey(fromLabel)
  const toKey = normalizeLocationKey(toLabel)
  const vehicleLabel = String(body.vehicleLabel || '').trim() || (await vehicleLabelOf(vehicleClass))

  try {
    const doc = await RoutePricingRule.create({
      serviceType,
      fromLabel,
      toLabel,
      fromKey,
      toKey,
      vehicleClass,
      vehicleLabel,
      customerPriceCny,
      driverPriceGbp,
      enabled,
      remark,
      createdBy: req.user?.userId || null,
      updatedBy: req.user?.userId || null
    })
    const exchangeRate = await getGbpCnyRate()
    const priced = await calculateRoutePrice({
      serviceType,
      from: fromLabel,
      to: toLabel,
      vehicleClass,
      exchangeRate
    })
    res.status(201).json({
      code: 0,
      message: 'success',
      data: { rule: { ...doc.toObject(), ...priced }, exchangeRate }
    })
  } catch (err) {
    if (err && err.code === 11000) {
      const e = new Error('该路线+车型报价已存在')
      e.code = 409
      throw e
    }
    throw err
  }
}

exports.updateRoutePricing = async (req, res) => {
  if (req.user?.role !== 'admin') {
    const e = new Error('仅管理员可修改路线报价')
    e.code = 403
    throw e
  }
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }

  const body = req.body || {}
  const patch = {}
  if (body.serviceType != null) patch.serviceType = await assertServiceTypeExists(body.serviceType)
  if (body.fromLabel != null) {
    patch.fromLabel = String(body.fromLabel).trim()
    patch.fromKey = normalizeLocationKey(patch.fromLabel)
  }
  if (body.toLabel != null) {
    patch.toLabel = String(body.toLabel).trim()
    patch.toKey = normalizeLocationKey(patch.toLabel)
  }
  if (body.vehicleClass != null) {
    patch.vehicleClass = await assertVehicleClassExists(body.vehicleClass)
    patch.vehicleLabel =
      String(body.vehicleLabel || '').trim() || (await vehicleLabelOf(patch.vehicleClass))
  } else if (body.vehicleLabel != null) {
    patch.vehicleLabel = String(body.vehicleLabel).trim()
  }
  if (body.customerPriceCny != null) patch.customerPriceCny = Number(body.customerPriceCny)
  if (body.driverPriceGbp != null) patch.driverPriceGbp = Number(body.driverPriceGbp)
  if (body.enabled != null) patch.enabled = body.enabled !== false
  if (body.remark != null) patch.remark = String(body.remark).trim()
  patch.updatedBy = req.user?.userId || null

  const doc = await RoutePricingRule.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean()
  if (!doc) {
    const e = new Error('路线报价不存在')
    e.code = 404
    throw e
  }
  const exchangeRate = await getGbpCnyRate()
  const priced = await calculateRoutePrice({
    serviceType: doc.serviceType,
    from: doc.fromLabel,
    to: doc.toLabel,
    vehicleClass: doc.vehicleClass,
    exchangeRate
  })
  res.json({
    code: 0,
    message: 'success',
    data: { rule: { ...doc, ...priced }, exchangeRate }
  })
}

/** 禁用（软删除） */
exports.patchRoutePricing = async (req, res) => {
  if (req.user?.role !== 'admin') {
    const e = new Error('仅管理员可修改路线报价')
    e.code = 403
    throw e
  }
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
  const enabled = req.body?.enabled !== false
  const doc = await RoutePricingRule.findByIdAndUpdate(
    id,
    { $set: { enabled, updatedBy: req.user?.userId || null } },
    { new: true }
  ).lean()
  if (!doc) {
    const e = new Error('路线报价不存在')
    e.code = 404
    throw e
  }
  res.json({ code: 0, message: 'success', data: { rule: doc } })
}
