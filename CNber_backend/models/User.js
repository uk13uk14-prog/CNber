const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    /** 密码哈希：默认查询不返回，避免误泄露；登录等场景需显式 .select('+password') */
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['user', 'driver', 'admin', 'operator', 'finance', 'support', 'dispatcher'],
      default: 'user'
    },
    /** 账号状态：封禁/解封由管理端写入，与 ban/unban 接口一致 */
    status: {
      type: String,
      enum: ['active', 'banned'],
      default: 'active'
    },
    /** 最近一次已登录 API 访问时间，用于在线/活跃统计 */
    lastSeen: {
      type: Date,
      default: null
    },
    /** 乘客资料（role=user） */
    passengerProfile: {
      realName: String,
      email: String,
      lastLoginAt: Date
    },
    /** 后台员工资料（role=admin/operator/finance/support/dispatcher） */
    adminProfile: {
      displayName: { type: String, default: '', trim: true },
      lastLoginAt: Date,
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
    },
    driverProfile: {
      status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'offline'
      },
      lastActiveAt: Date,

      realName: String,
      phone: String,
      email: String,
      address: String,

      licenseNo: String,
      licenseNumber: String,
      licenseExpireAt: Date,
      insuranceValidUntil: Date,
      motValidUntil: Date,
      pcoLicenseNumber: String,
      vehiclePhoto: String,
      vehiclePlate: String,
      vehicleModel: String,
      approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },

      payment: {
        defaultMethod: {
          type: String,
          enum: ['alipay', 'wechat'],
          default: 'alipay'
        },
        alipayName: String,
        alipayAccount: String,
        wechatName: String,
        wechatAccount: String
      },

      vehicle: {
        plateNo: String,
        model: String,
        vehiclePlate: String,
        vehicleModel: String,
        vehiclePhoto: String,
        seats: Number,
        motExpireAt: Date,
        insuranceExpireAt: Date
      },

      documents: {
        licenseImage: String,
        insuranceImage: String,
        motImage: String,
        reviewStatus: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending'
        },
        reviewRemark: String
      }
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('User', UserSchema)
