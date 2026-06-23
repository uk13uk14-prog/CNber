const mongoose = require('mongoose')
const User = require('../models/User')
const Driver = require('../models/Driver')
const { logPushPayload } = require('../utils/operationLog')

function assertUserId(id) {
  if (!mongoose.Types.ObjectId.isValid(String(id || ''))) {
    const e = new Error('司机用户 ID 无效')
    e.code = 400
    throw e
  }
}

async function ensureDriverDoc(userId) {
  let doc = await Driver.findOne({ userId })
  const user = await User.findById(userId)
  if (!user || user.role !== 'driver') {
    const e = new Error('司机用户不存在')
    e.code = 404
    throw e
  }
  if (!doc) {
    const dp = user.driverProfile || {}
    doc = await Driver.create({
      userId,
      licenseNumber: dp.licenseNumber || dp.licenseNo || '',
      carPlate: dp.vehiclePlate || dp.vehicle?.plateNo || '',
      vehicleModel: dp.vehicleModel || dp.vehicle?.model || '',
      vehiclePlate: dp.vehiclePlate || dp.vehicle?.vehiclePlate || '',
      drivingLicenseImage: dp.documents?.licenseImage || '',
      insuranceImage: dp.documents?.insuranceImage || '',
      verificationStatus: dp.approvalStatus || 'pending',
      isActive: dp.approvalStatus === 'approved'
    })
  }
  return { user, driver: doc }
}

function serializeDriver(user, driver) {
  const dp = user.driverProfile || {}
  return {
    userId: user._id,
    phone: user.phone,
    driverId: driver._id,
    verificationStatus: driver.verificationStatus,
    isActive: driver.isActive,
    drivingLicenseImage: driver.drivingLicenseImage || dp.documents?.licenseImage || '',
    insuranceImage: driver.insuranceImage || dp.documents?.insuranceImage || '',
    vehicleModel: driver.vehicleModel || dp.vehicleModel || '',
    vehiclePlate: driver.vehiclePlate || driver.carPlate || '',
    serviceAreas: driver.serviceAreas || [],
    serviceTypes: driver.serviceTypes || [],
    paymentMethod: driver.paymentMethod || dp.payment?.defaultMethod || '',
    paymentAccount:
      driver.paymentAccount ||
      dp.payment?.alipayAccount ||
      dp.payment?.wechatAccount ||
      '',
    adminNotes: driver.adminNotes || '',
    score: driver.score,
    totalOrders: driver.totalOrders,
    reviewedAt: driver.reviewedAt,
    onlineStatus: dp.status || 'offline'
  }
}

/** GET /admin/drivers/onboarding */
exports.listOnboarding = async (req, res) => {
  const status = String(req.query.verificationStatus || req.query.status || '').trim()
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)))

  const userQuery = { role: 'driver' }
  if (status) {
    userQuery['driverProfile.approvalStatus'] = status
  }

  const [users, total] = await Promise.all([
    User.find(userQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    User.countDocuments(userQuery)
  ])

  const items = []
  for (const u of users) {
    const driver = await Driver.findOne({ userId: u._id }).lean()
    items.push(
      serializeDriver(
        u,
        driver || {
          verificationStatus: u.driverProfile?.approvalStatus || 'pending',
          isActive: false,
          serviceAreas: [],
          serviceTypes: []
        }
      )
    )
  }

  res.json({
    code: 0,
    message: 'success',
    data: { items, total, page, pageSize }
  })
}

/** GET /admin/drivers/:userId/onboarding */
exports.getOnboarding = async (req, res) => {
  const { userId } = req.params
  assertUserId(userId)
  const { user, driver } = await ensureDriverDoc(userId)
  res.json({
    code: 0,
    message: 'success',
    data: { driver: serializeDriver(user, driver) }
  })
}

/** PATCH /admin/drivers/:userId/verification */
exports.patchVerification = async (req, res) => {
  const { userId } = req.params
  assertUserId(userId)
  const verificationStatus = String(req.body?.verificationStatus || '').trim()
  const allowed = Driver.VERIFICATION_STATUSES
  if (!allowed.includes(verificationStatus)) {
    const e = new Error('无效的 verificationStatus')
    e.code = 400
    throw e
  }

  const adminNotes = req.body?.adminNotes != null ? String(req.body.adminNotes).trim() : undefined
  const { user, driver } = await ensureDriverDoc(userId)
  const reviewer = req.user.userId

  driver.verificationStatus = verificationStatus
  driver.isActive = verificationStatus === 'approved'
  driver.reviewedBy = reviewer
  driver.reviewedAt = new Date()
  if (adminNotes !== undefined) driver.adminNotes = adminNotes

  const bodyFields = [
    'drivingLicenseImage',
    'insuranceImage',
    'vehicleModel',
    'vehiclePlate',
    'serviceAreas',
    'serviceTypes',
    'paymentMethod',
    'paymentAccount'
  ]
  for (const f of bodyFields) {
    if (req.body[f] !== undefined) driver[f] = req.body[f]
  }
  await driver.save()

  const profilePatch = {
    'driverProfile.approvalStatus':
      verificationStatus === 'suspended' ? 'rejected' : verificationStatus,
    updatedAt: new Date()
  }
  if (verificationStatus === 'approved') {
    profilePatch['driverProfile.documents.reviewStatus'] = 'approved'
  } else if (verificationStatus === 'rejected' || verificationStatus === 'suspended') {
    profilePatch['driverProfile.documents.reviewStatus'] = 'rejected'
  }

  await User.findByIdAndUpdate(userId, { $set: profilePatch })

  res.json({
    code: 0,
    message: 'success',
    data: { driver: serializeDriver(await User.findById(userId).lean(), driver.toObject()) }
  })
}

/** PATCH /admin/drivers/:userId/active */
exports.patchActive = async (req, res) => {
  const { userId } = req.params
  assertUserId(userId)
  const isActive = Boolean(req.body?.isActive)
  const { user, driver } = await ensureDriverDoc(userId)
  if (isActive && driver.verificationStatus !== 'approved') {
    const e = new Error('未审核通过的司机不能启用')
    e.code = 400
    throw e
  }
  driver.isActive = isActive
  await driver.save()
  res.json({
    code: 0,
    message: 'success',
    data: { driver: serializeDriver(user, driver.toObject()) }
  })
}
