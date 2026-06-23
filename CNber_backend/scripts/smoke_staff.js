#!/usr/bin/env node
const assert = require('assert')
const {
  STAFF_ROLES,
  CREATABLE_STAFF_ROLES,
  isStaffRole,
  roleCanAccess
} = require('../utils/staffRoles')

assert.deepStrictEqual(STAFF_ROLES.length, 5)
assert.ok(!CREATABLE_STAFF_ROLES.includes('admin'))
assert.strictEqual(isStaffRole('admin'), true)
assert.strictEqual(isStaffRole('operator'), true)
assert.strictEqual(isStaffRole('user'), false)
assert.strictEqual(roleCanAccess('admin', ['finance']), true)
assert.strictEqual(roleCanAccess('finance', ['finance']), true)
assert.strictEqual(roleCanAccess('support', ['finance']), false)

const User = require('../models/User')
const roles = User.schema.path('role').enumValues
for (const r of CREATABLE_STAFF_ROLES) {
  assert.ok(roles.includes(r), `User.role missing ${r}`)
}

console.log('smoke_staff ok')
