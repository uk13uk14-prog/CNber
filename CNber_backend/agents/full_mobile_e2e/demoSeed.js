/**
 * Demo 测试账号与收款账户 — 仅 cnber_demo_agent 标记，不影响真实用户
 */
const bcrypt = require('bcryptjs')
const User = require('../../models/User')
const Driver = require('../../models/Driver')
const PaymentAccount = require('../../models/PaymentAccount')

const DEMO_TAG = 'cnber_demo_agent'
const DEMO_PASSWORD = process.env.DEMO_AGENT_PASSWORD || `CnberDemo_${DEMO_TAG}_dev`

const ACCOUNTS = {
  customer: {
    phone: process.env.MOBILE_AGENT_PHONE || 'cnber_demo_agent_customer@cnber.local',
    role: 'user'
  },
  driver: {
    phone: process.env.MOBILE_AGENT_DRIVER_PHONE || 'cnber_demo_agent_driver@cnber.local',
    role: 'driver'
  },
  admin: {
    phone: process.env.E2E_ADMIN_PHONE || 'cnber_demo_agent_admin@cnber.local',
    role: 'admin'
  }
}

const PAYMENT_ACCOUNTS = [
  {
    paymentType: 'wise',
    displayName: `${DEMO_TAG} Wise 收款`,
    accountName: 'CNber Demo Agent Ltd',
    wiseLink: 'https://wise.com/pay/me/cnber-demo-agent',
    note: `转账备注请填 CNBER-订单号 [${DEMO_TAG}]`,
    sortOrder: 99
  },
  {
    paymentType: 'wechat',
    displayName: `${DEMO_TAG} 微信收款`,
    accountName: 'CNber Demo WeChat',
    wechatQrImage: 'https://placehold.co/300x300/png?text=WeChat+Demo',
    note: `[${DEMO_TAG}] 微信 demo`,
    sortOrder: 98
  },
  {
    paymentType: 'alipay',
    displayName: `${DEMO_TAG} 支付宝收款`,
    accountName: 'CNber Demo Alipay',
    alipayQrImage: 'https://placehold.co/300x300/png?text=Alipay+Demo',
    note: `[${DEMO_TAG}] 支付宝 demo`,
    sortOrder: 97
  }
]

async function upsertDemoAccounts() {
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10)

  const customer = await User.findOneAndUpdate(
    { phone: ACCOUNTS.customer.phone },
    {
      $set: {
        phone: ACCOUNTS.customer.phone,
        password: hashed,
        role: 'user',
        status: 'active',
        passengerProfile: { realName: 'Demo Agent Customer', note: DEMO_TAG }
      }
    },
    { upsert: true, new: true }
  )

  const driverUser = await User.findOneAndUpdate(
    { phone: ACCOUNTS.driver.phone },
    {
      $set: {
        phone: ACCOUNTS.driver.phone,
        password: hashed,
        role: 'driver',
        status: 'active',
        driverProfile: {
          approvalStatus: 'approved',
          status: 'online',
          realName: 'Demo Agent Driver',
          vehiclePlate: 'DEMO-AGENT',
          vehicleModel: 'Demo Agent Car',
          documents: { reviewStatus: 'approved' },
          note: DEMO_TAG
        }
      }
    },
    { upsert: true, new: true }
  )

  const admin = await User.findOneAndUpdate(
    { phone: ACCOUNTS.admin.phone },
    {
      $set: {
        phone: ACCOUNTS.admin.phone,
        password: hashed,
        role: 'admin',
        status: 'active',
        adminProfile: { displayName: 'Demo Agent Admin', note: DEMO_TAG }
      }
    },
    { upsert: true, new: true }
  )

  await Driver.findOneAndUpdate(
    { userId: driverUser._id },
    {
      $set: {
        userId: driverUser._id,
        verificationStatus: 'approved',
        isActive: true,
        vehiclePlate: 'DEMO-AGENT',
        vehicleModel: 'Demo Agent Car',
        status: 'approved',
        adminNotes: DEMO_TAG
      }
    },
    { upsert: true, new: true }
  )

  for (const seed of PAYMENT_ACCOUNTS) {
    await PaymentAccount.findOneAndUpdate(
      { displayName: seed.displayName },
      {
        $set: {
          ...seed,
          method: seed.paymentType,
          enabled: true,
          isActive: true
        }
      },
      { upsert: true, new: true }
    )
  }

  return {
    tag: DEMO_TAG,
    password: DEMO_PASSWORD,
    accounts: ACCOUNTS,
    userIds: {
      customer: customer._id.toString(),
      driver: driverUser._id.toString(),
      admin: admin._id.toString()
    }
  }
}

module.exports = {
  DEMO_TAG,
  DEMO_PASSWORD,
  ACCOUNTS,
  upsertDemoAccounts
}
