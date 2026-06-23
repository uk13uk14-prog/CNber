const mongoose = require('mongoose')
const {
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  MODULE_LABELS,
  ACTION_LABELS,
  getFullPermissions
} = require('../utils/permissionMatrix')
const {
  getEffectivePermissionsForRole,
  listAllRolePermissions,
  upsertRolePermissions,
  resetRolePermissions
} = require('../services/rolePermissionService')

function staffObjectId(req) {
  const raw = req.user?.userId || req.user?._id
  if (!raw || !mongoose.Types.ObjectId.isValid(String(raw))) return null
  return new mongoose.Types.ObjectId(String(raw))
}

/** GET /api/admin/role-permissions */
exports.listRolePermissions = async (req, res) => {
  const data = await listAllRolePermissions()
  res.json({
    code: 0,
    data: {
      ...data,
      modules: PERMISSION_MODULES,
      actions: PERMISSION_ACTIONS,
      moduleLabels: MODULE_LABELS,
      actionLabels: ACTION_LABELS
    }
  })
}

/** PUT /api/admin/role-permissions/:role */
exports.putRolePermissions = async (req, res) => {
  const role = String(req.params.role || '').trim()
  if (role === 'admin') {
    const e = new Error('admin 权限不可修改')
    e.code = 400
    throw e
  }
  const doc = await upsertRolePermissions(role, req.body?.permissions || {}, staffObjectId(req))
  res.json({
    code: 0,
    data: {
      role: doc.role,
      permissions: doc.permissions,
      updatedAt: doc.updatedAt
    }
  })
}

/** POST /api/admin/role-permissions/:role/reset */
exports.resetRolePermissionTemplate = async (req, res) => {
  const role = String(req.params.role || '').trim()
  const permissions = await resetRolePermissions(role)
  res.json({
    code: 0,
    data: { role, permissions }
  })
}

/** GET /api/admin/me/permissions */
exports.getMyPermissions = async (req, res) => {
  const role = req.user?.role
  const permissions =
    role === 'admin' ? getFullPermissions() : await getEffectivePermissionsForRole(role)
  res.json({
    code: 0,
    data: {
      role,
      permissions,
      isAdmin: role === 'admin'
    }
  })
}
