const mongoose = require('mongoose')
const ServiceTypeConfig = require('../models/ServiceTypeConfig')
const VehicleClassConfig = require('../models/VehicleClassConfig')
const {
  invalidateCatalogCache,
  normalizeCode,
  getServiceTypeRows,
  getVehicleClassRows
} = require('../utils/catalogConfig')

function requireAdmin(req) {
  if (req.user?.role !== 'admin') {
    const e = new Error('仅管理员可修改配置')
    e.code = 403
    throw e
  }
}

function parseCode(raw, label = 'code') {
  const code = normalizeCode(raw)
  if (!ServiceTypeConfig.CODE_RE.test(code)) {
    const e = new Error(`${label} 格式无效，请使用小写英文/数字/下划线`)
    e.code = 400
    throw e
  }
  return code
}

exports.listServiceTypes = async (req, res) => {
  const enabledOnly = req.query.enabled === 'true' || req.query.enabled === '1'
  const query = enabledOnly ? { enabled: true } : {}
  const items = await ServiceTypeConfig.find(query).sort({ sortOrder: 1, code: 1 }).lean()
  res.json({ code: 0, message: 'success', data: { items } })
}

exports.createServiceType = async (req, res) => {
  requireAdmin(req)
  const body = req.body || {}
  const code = parseCode(body.code, '服务代码')
  const label = String(body.label || '').trim()
  const enabled = body.enabled !== false
  const sortOrder = Number(body.sortOrder ?? 100)
  const remark = String(body.remark ?? '').trim()

  if (!label) {
    const e = new Error('请填写服务名称')
    e.code = 400
    throw e
  }

  try {
    const doc = await ServiceTypeConfig.create({
      code,
      label,
      enabled,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
      remark,
      updatedBy: req.user?.userId || null
    })
    invalidateCatalogCache()
    res.status(201).json({ code: 0, message: 'success', data: { item: doc.toObject() } })
  } catch (err) {
    if (err && err.code === 11000) {
      const e = new Error('服务代码已存在')
      e.code = 409
      throw e
    }
    throw err
  }
}

exports.updateServiceType = async (req, res) => {
  requireAdmin(req)
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }

  const body = req.body || {}
  const patch = { updatedBy: req.user?.userId || null }
  if (body.label != null) {
    const label = String(body.label).trim()
    if (!label) {
      const e = new Error('服务名称不能为空')
      e.code = 400
      throw e
    }
    patch.label = label
  }
  if (body.enabled != null) patch.enabled = body.enabled !== false
  if (body.sortOrder != null) {
    const sortOrder = Number(body.sortOrder)
    if (Number.isFinite(sortOrder)) patch.sortOrder = sortOrder
  }
  if (body.remark != null) patch.remark = String(body.remark).trim()

  const doc = await ServiceTypeConfig.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean()
  if (!doc) {
    const e = new Error('服务类型不存在')
    e.code = 404
    throw e
  }
  invalidateCatalogCache()
  res.json({ code: 0, message: 'success', data: { item: doc } })
}

exports.listVehicleClasses = async (req, res) => {
  const enabledOnly = req.query.enabled === 'true' || req.query.enabled === '1'
  const query = enabledOnly ? { enabled: true } : {}
  const items = await VehicleClassConfig.find(query).sort({ sortOrder: 1, code: 1 }).lean()
  res.json({ code: 0, message: 'success', data: { items } })
}

exports.createVehicleClass = async (req, res) => {
  requireAdmin(req)
  const body = req.body || {}
  const code = parseCode(body.code, '车型代码')
  const label = String(body.label || '').trim()
  const enabled = body.enabled !== false
  const sortOrder = Number(body.sortOrder ?? 100)
  const remark = String(body.remark ?? '').trim()
  const seatsRaw = body.seats
  const seats =
    seatsRaw == null || seatsRaw === ''
      ? null
      : Number(seatsRaw)

  if (!label) {
    const e = new Error('请填写车型名称')
    e.code = 400
    throw e
  }
  if (seats != null && (!Number.isFinite(seats) || seats <= 0)) {
    const e = new Error('座位数必须为正整数')
    e.code = 400
    throw e
  }

  try {
    const doc = await VehicleClassConfig.create({
      code,
      label,
      seats,
      enabled,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
      remark,
      updatedBy: req.user?.userId || null
    })
    invalidateCatalogCache()
    res.status(201).json({ code: 0, message: 'success', data: { item: doc.toObject() } })
  } catch (err) {
    if (err && err.code === 11000) {
      const e = new Error('车型代码已存在')
      e.code = 409
      throw e
    }
    throw err
  }
}

exports.updateVehicleClass = async (req, res) => {
  requireAdmin(req)
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }

  const body = req.body || {}
  const patch = { updatedBy: req.user?.userId || null }
  if (body.label != null) {
    const label = String(body.label).trim()
    if (!label) {
      const e = new Error('车型名称不能为空')
      e.code = 400
      throw e
    }
    patch.label = label
  }
  if (body.enabled != null) patch.enabled = body.enabled !== false
  if (body.sortOrder != null) {
    const sortOrder = Number(body.sortOrder)
    if (Number.isFinite(sortOrder)) patch.sortOrder = sortOrder
  }
  if (body.remark != null) patch.remark = String(body.remark).trim()
  if (body.seats != null) {
    const seats = body.seats === '' || body.seats == null ? null : Number(body.seats)
    if (seats != null && (!Number.isFinite(seats) || seats <= 0)) {
      const e = new Error('座位数必须为正整数')
      e.code = 400
      throw e
    }
    patch.seats = seats
  }

  const doc = await VehicleClassConfig.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean()
  if (!doc) {
    const e = new Error('车型不存在')
    e.code = 404
    throw e
  }
  invalidateCatalogCache()
  res.json({ code: 0, message: 'success', data: { item: doc } })
}

/** 公开：启用车型（客户端） */
exports.listPublicVehicleClasses = async (req, res) => {
  const items = await VehicleClassConfig.find({ enabled: true })
    .sort({ sortOrder: 1, code: 1 })
    .select('code label seats sortOrder')
    .lean()
  res.json({ code: 0, message: 'success', data: { items } })
}

exports.listPublicServiceTypes = async (req, res) => {
  const items = await ServiceTypeConfig.find({ enabled: true })
    .sort({ sortOrder: 1, code: 1 })
    .select('code label sortOrder')
    .lean()
  res.json({ code: 0, message: 'success', data: { items } })
}

module.exports.ensureCatalogLoaded = async function ensureCatalogLoaded() {
  await getServiceTypeRows()
  await getVehicleClassRows()
}
