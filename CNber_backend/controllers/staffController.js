const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const {
  STAFF_ROLES,
  CREATABLE_STAFF_ROLES,
  ROLE_LABELS,
  isStaffRole
} = require('../utils/staffRoles')

function assertValidId(id) {
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    const e = new Error('ID 无效')
    e.code = 400
    throw e
  }
}

function staffObjectId(req) {
  const raw = req.user?.userId || req.user?._id
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) return null
  return new mongoose.Types.ObjectId(String(raw))
}

function serializeStaff(user) {
  const o = user.toObject ? user.toObject() : user
  return {
    _id: o._id,
    phone: o.phone,
    role: o.role,
    status: o.status,
    displayName: o.adminProfile?.displayName || '',
    lastLoginAt: o.adminProfile?.lastLoginAt || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  }
}

/** GET /admin/staff */
exports.listStaff = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
  const skip = (page - 1) * pageSize
  const q = { role: { $in: STAFF_ROLES } }
  const search = String(req.query.search || '').trim()
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    q.$or = [{ phone: re }, { 'adminProfile.displayName': re }]
  }
  const role = String(req.query.role || '').trim()
  if (role && STAFF_ROLES.includes(role)) q.role = role
  const status = String(req.query.status || '').trim()
  if (status === 'active' || status === 'banned') q.status = status

  const [rows, total] = await Promise.all([
    User.find(q)
      .select('phone role status adminProfile createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    User.countDocuments(q)
  ])

  res.json({
    code: 0,
    message: 'success',
    data: {
      rows: rows.map((r) => ({
        _id: r._id,
        phone: r.phone,
        role: r.role,
        status: r.status,
        displayName: r.adminProfile?.displayName || '',
        lastLoginAt: r.adminProfile?.lastLoginAt || null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })),
      total,
      page,
      pageSize,
      roleLabels: ROLE_LABELS,
      creatableRoles: CREATABLE_STAFF_ROLES
    }
  })
}

/** POST /admin/staff */
exports.createStaff = async (req, res) => {
  const body = req.body || {}
  const phone = String(body.phone || '').trim()
  const password = String(body.password || '')
  const role = String(body.role || '').trim()
  const displayName = String(body.displayName || '').trim()

  if (!phone || !password) {
    const e = new Error('手机号和密码不能为空')
    e.code = 400
    throw e
  }
  if (password.length < 6) {
    const e = new Error('密码至少 6 位')
    e.code = 400
    throw e
  }
  if (!CREATABLE_STAFF_ROLES.includes(role)) {
    const e = new Error(`角色须为：${CREATABLE_STAFF_ROLES.join(' / ')}`)
    e.code = 400
    throw e
  }

  const exists = await User.findOne({ phone })
  if (exists) {
    const e = new Error('该手机号已存在')
    e.code = 409
    throw e
  }

  const creatorId = staffObjectId(req)
  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await User.create({
    phone,
    password: hashedPassword,
    role,
    status: 'active',
    adminProfile: {
      displayName,
      createdBy: creatorId
    }
  })

  res.status(201).json({
    code: 0,
    message: 'success',
    data: serializeStaff(user)
  })
}

/** PATCH /admin/staff/:id/status — active | banned */
exports.patchStaffStatus = async (req, res) => {
  assertValidId(req.params.id)
  const status = String(req.body?.status || '').trim()
  if (!['active', 'banned'].includes(status)) {
    const e = new Error('status 须为 active 或 banned')
    e.code = 400
    throw e
  }

  const target = await User.findById(req.params.id).select('role phone status')
  if (!target || !isStaffRole(target.role)) {
    const e = new Error('员工不存在')
    e.code = 404
    throw e
  }

  if (target.role === 'admin') {
    const e = new Error('不可禁用或变更超级管理员账号状态')
    e.code = 403
    throw e
  }

  const selfId = staffObjectId(req)
  if (selfId && String(target._id) === String(selfId) && status === 'banned') {
    const e = new Error('不可禁用自己的账号')
    e.code = 403
    throw e
  }

  const user = await User.findByIdAndUpdate(
    target._id,
    { $set: { status } },
    { new: true }
  ).select('phone role status adminProfile createdAt updatedAt')

  res.json({
    code: 0,
    message: 'success',
    data: serializeStaff(user)
  })
}

/** POST /admin/staff/:id/reset-password */
exports.resetStaffPassword = async (req, res) => {
  assertValidId(req.params.id)
  const password = String(req.body?.password || '')
  if (!password || password.length < 6) {
    const e = new Error('新密码至少 6 位')
    e.code = 400
    throw e
  }

  const target = await User.findById(req.params.id).select('role phone')
  if (!target || !isStaffRole(target.role)) {
    const e = new Error('员工不存在')
    e.code = 404
    throw e
  }

  if (target.role === 'admin' && String(target._id) !== String(staffObjectId(req))) {
    const e = new Error('不可重置其他超级管理员密码')
    e.code = 403
    throw e
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  await User.findByIdAndUpdate(target._id, { $set: { password: hashedPassword } })

  res.json({
    code: 0,
    message: 'success',
    data: { _id: target._id, phone: target.phone }
  })
}

/** GET /admin/staff/roles — 角色说明（只读） */
exports.listStaffRoles = async (_req, res) => {
  const matrix = [
    { role: 'admin', label: ROLE_LABELS.admin, scopes: ['全部模块'] },
    {
      role: 'operator',
      label: ROLE_LABELS.operator,
      scopes: ['工作台', '订单', '司机', '客户', '画像']
    },
    {
      role: 'finance',
      label: ROLE_LABELS.finance,
      scopes: ['工作台', '支付审核', '财务对账', '订单收付款确认']
    },
    {
      role: 'support',
      label: ROLE_LABELS.support,
      scopes: ['工作台', '客户', '客户画像']
    },
    {
      role: 'dispatcher',
      label: ROLE_LABELS.dispatcher,
      scopes: ['工作台', '订单', '调度', '司机', '司机画像']
    }
  ]
  res.json({
    code: 0,
    message: 'success',
    data: { roles: matrix, creatableRoles: CREATABLE_STAFF_ROLES }
  })
}
