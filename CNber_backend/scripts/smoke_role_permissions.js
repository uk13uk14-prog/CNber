#!/usr/bin/env node
/**
 * 角色权限 V2 smoke
 * 用法: node scripts/smoke_role_permissions.js
 */
require('dotenv').config()

const assert = require('assert')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const RolePermission = require('../models/RolePermission')
const {
  DEFAULT_ROLE_PERMISSIONS,
  getFullPermissions,
  hasPermission,
  getPermissionsForRole,
  PERMISSION_MODULES,
  PERMISSION_ACTIONS
} = require('../utils/permissionMatrix')
const { requirePermission } = require('../middlewares/staffAccess')
const rolePermissionController = require('../controllers/rolePermissionController')
const {
  clearPermissionCache,
  getEffectivePermissionsForRole,
  upsertRolePermissions
} = require('../services/rolePermissionService')

const mongoUrl =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/cnber'

const ADMIN_PHONE = 'admin@cnber.local'
const SUPPORT_PHONE = 'smoke_support_perm@cnber.local'
const FINANCE_PHONE = 'smoke_finance_perm@cnber.local'

function mockReq(user, body = {}, query = {}, params = {}) {
  return {
    user: {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role
    },
    body,
    query,
    params,
    ip: '127.0.0.1'
  }
}

async function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload })
      }
    }
    const next = (err) => reject(err)
    Promise.resolve(handler(req, res, next)).catch(reject)
  })
}

async function runMiddleware(mw, req) {
  return new Promise((resolve, reject) => {
    mw(req, {}, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

async function upsertUser({ phone, password, role }) {
  const hashed = await bcrypt.hash(password, 10)
  return User.findOneAndUpdate(
    { phone },
    { $set: { phone, password: hashed, role, status: 'active' } },
    { upsert: true, new: true }
  )
}

async function main() {
  assert.strictEqual(PERMISSION_MODULES.length, 19)
  assert.strictEqual(PERMISSION_ACTIONS.length, 6)
  assert.ok(DEFAULT_ROLE_PERMISSIONS.operator.orders.includes('update'))

  await mongoose.connect(mongoUrl)
  clearPermissionCache()

  const admin = await upsertUser({ phone: ADMIN_PHONE, password: '123456', role: 'admin' })
  const support = await upsertUser({ phone: SUPPORT_PHONE, password: '123456', role: 'support' })
  const finance = await upsertUser({ phone: FINANCE_PHONE, password: '123456', role: 'finance' })

  // 1. admin 拥有全部权限
  const adminPerms = await getEffectivePermissionsForRole('admin')
  for (const mod of PERMISSION_MODULES) {
    for (const act of PERMISSION_ACTIONS) {
      assert.strictEqual(
        hasPermission({ role: 'admin' }, mod, act, adminPerms),
        true,
        `admin should have ${mod}.${act}`
      )
    }
  }

  // 2. finance 无 staff 权限
  const financePerms = await getEffectivePermissionsForRole('finance')
  assert.strictEqual(hasPermission({ role: 'finance' }, 'staff', 'view', financePerms), false)

  // 3. 修改 support 增加 coupons.view 后生效
  await upsertRolePermissions('support', {
    ...getPermissionsForRole('support'),
    coupons: ['view']
  }, admin._id)
  clearPermissionCache()
  const supportAfter = await getEffectivePermissionsForRole('support')
  assert.strictEqual(hasPermission({ role: 'support' }, 'coupons', 'view', supportAfter), true)
  assert.strictEqual(hasPermission({ role: 'support' }, 'coupons', 'create', supportAfter), false)

  // 4. GET /api/admin/me/permissions 返回正确
  const meRes = await invoke(rolePermissionController.getMyPermissions, mockReq(support))
  assert.strictEqual(meRes.status, 200)
  assert.strictEqual(meRes.body.code, 0)
  assert.strictEqual(meRes.body.data.role, 'support')
  assert.ok(meRes.body.data.permissions.coupons.includes('view'))

  const adminMe = await invoke(rolePermissionController.getMyPermissions, mockReq(admin))
  assert.strictEqual(adminMe.body.data.isAdmin, true)
  assert.ok(adminMe.body.data.permissions.staff.includes('create'))

  // 5. 无权限 API 返回 403
  const denyStaff = requirePermission('staff', 'view')
  await assert.rejects(
    () => runMiddleware(denyStaff, mockReq(finance)),
    (err) => err && err.code === 403
  )

  const allowCoupons = requirePermission('coupons', 'view')
  await runMiddleware(allowCoupons, mockReq(support))

  const denyCouponsCreate = requirePermission('coupons', 'create')
  await assert.rejects(
    () => runMiddleware(denyCouponsCreate, mockReq(support)),
    (err) => err && err.code === 403
  )

  // admin 不可编辑
  try {
    await upsertRolePermissions('admin', { coupons: ['view'] }, admin._id)
    assert.fail('should not edit admin')
  } catch (e) {
    assert.strictEqual(e.code, 400)
  }

  // 空表时使用默认模板
  await RolePermission.deleteMany({})
  clearPermissionCache()
  const operatorDefault = await getEffectivePermissionsForRole('operator')
  assert.deepStrictEqual(
    operatorDefault.orders,
    DEFAULT_ROLE_PERMISSIONS.operator.orders
  )

  // 清理测试写入
  await RolePermission.deleteMany({ role: 'support' })
  clearPermissionCache()

  await mongoose.disconnect()
  console.log('smoke_role_permissions ok')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
