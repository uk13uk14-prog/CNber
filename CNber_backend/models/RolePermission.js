const mongoose = require('mongoose')
const { STAFF_ROLES } = require('../utils/staffRoles')

const rolePermissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: STAFF_ROLES.filter((r) => r !== 'admin'),
      unique: true
    },
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('RolePermission', rolePermissionSchema)
