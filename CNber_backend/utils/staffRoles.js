/** 后台员工角色（与 User.role 一致） */
const STAFF_ROLES = ['admin', 'operator', 'finance', 'support', 'dispatcher']

/** 可新建的员工角色（不含 admin，避免误创超级管理员） */
const CREATABLE_STAFF_ROLES = ['operator', 'finance', 'support', 'dispatcher']

const ROLE_LABELS = {
  admin: '超级管理员',
  operator: '运营',
  finance: '财务',
  support: '客服',
  dispatcher: '调度'
}

function isStaffRole(role) {
  return STAFF_ROLES.includes(role)
}

/** admin 拥有全部权限 */
function roleCanAccess(userRole, allowedRoles = []) {
  if (!userRole) return false
  if (userRole === 'admin') return true
  return allowedRoles.includes(userRole)
}

module.exports = {
  STAFF_ROLES,
  CREATABLE_STAFF_ROLES,
  ROLE_LABELS,
  isStaffRole,
  roleCanAccess
}
