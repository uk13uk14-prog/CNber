const { roleCanAccess } = require('../utils/staffRoles')
const { hasPermission } = require('../utils/permissionMatrix')
const { getEffectivePermissionsForRole } = require('../services/rolePermissionService')

/** 路由级最小权限：admin 始终放行 */
function requireStaffRoles(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role
    if (!role) {
      const e = new Error('无效登录')
      e.code = 401
      return next(e)
    }
    if (!roleCanAccess(role, allowedRoles)) {
      const e = new Error('Forbidden')
      e.code = 403
      return next(e)
    }
    next()
  }
}

/** 模块级权限：admin 始终放行 */
function requirePermission(module, action) {
  return async (req, res, next) => {
    const role = req.user?.role
    if (!role) {
      const e = new Error('无效登录')
      e.code = 401
      return next(e)
    }
    if (role === 'admin') return next()
    try {
      const perms = await getEffectivePermissionsForRole(role)
      if (!hasPermission(req.user, module, action, perms)) {
        const e = new Error('Forbidden')
        e.code = 403
        return next(e)
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = { requireStaffRoles, requirePermission }
