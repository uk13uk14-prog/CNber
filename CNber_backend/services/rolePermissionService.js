const RolePermission = require('../models/RolePermission')
const {
  DEFAULT_ROLE_PERMISSIONS,
  getFullPermissions,
  getPermissionsForRole,
  normalizePermissionsObject,
  isEditableRole
} = require('../utils/permissionMatrix')

let cachedMatrix = null
let cacheAt = 0
const CACHE_MS = 5000

async function loadStoredMatrix(force = false) {
  const now = Date.now()
  if (!force && cachedMatrix && now - cacheAt < CACHE_MS) {
    return cachedMatrix
  }
  const rows = await RolePermission.find({}).lean()
  const map = {}
  for (const row of rows) {
    map[row.role] = normalizePermissionsObject(row.permissions)
  }
  cachedMatrix = map
  cacheAt = now
  return map
}

function clearPermissionCache() {
  cachedMatrix = null
  cacheAt = 0
}

async function getEffectivePermissionsForRole(role) {
  if (role === 'admin') return getFullPermissions()
  const stored = await loadStoredMatrix()
  const hasAnyStored = Object.keys(stored).length > 0
  if (!hasAnyStored) {
    return getPermissionsForRole(role, null)
  }
  return getPermissionsForRole(role, stored)
}

async function listAllRolePermissions() {
  const stored = await loadStoredMatrix()
  const hasAnyStored = Object.keys(stored).length > 0
  const roles = Object.keys(DEFAULT_ROLE_PERMISSIONS)
  const items = roles.map((role) => ({
    role,
    permissions: hasAnyStored
      ? getPermissionsForRole(role, stored)
      : getPermissionsForRole(role, null),
    isDefault: !stored[role]
  }))
  return {
    roles: items,
    adminPermissions: getFullPermissions(),
    defaults: DEFAULT_ROLE_PERMISSIONS
  }
}

async function upsertRolePermissions(role, permissions, updatedBy) {
  if (!isEditableRole(role)) {
    const e = new Error('该角色不可编辑')
    e.code = 400
    throw e
  }
  const normalized = normalizePermissionsObject(permissions)
  const doc = await RolePermission.findOneAndUpdate(
    { role },
    { $set: { permissions: normalized, updatedBy: updatedBy || null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()
  clearPermissionCache()
  return doc
}

async function resetRolePermissions(role) {
  if (!isEditableRole(role)) {
    const e = new Error('该角色不可重置')
    e.code = 400
    throw e
  }
  await RolePermission.deleteOne({ role })
  clearPermissionCache()
  return getPermissionsForRole(role, null)
}

module.exports = {
  loadStoredMatrix,
  clearPermissionCache,
  getEffectivePermissionsForRole,
  listAllRolePermissions,
  upsertRolePermissions,
  resetRolePermissions
}
