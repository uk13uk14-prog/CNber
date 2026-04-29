const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    /** 密码哈希：默认查询不返回，避免误泄露；登录等场景需显式 .select('+password') */
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['user', 'driver', 'admin'],
      default: 'user'
    },
    /** 账号状态：封禁/解封由管理端写入，与 ban/unban 接口一致 */
    status: {
      type: String,
      enum: ['active', 'banned'],
      default: 'active'
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
      licenseExpireAt: Date,

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
