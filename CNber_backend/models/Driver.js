const mongoose = require('mongoose')

const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected', 'suspended']

const DriverSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  licenseNumber: { type: String, default: '', trim: true },
  carPlate: { type: String, default: '', trim: true },
  score: { type: Number, default: 5 },
  totalOrders: { type: Number, default: 0 },
  /** 兼容旧字段 */
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'banned'],
    default: 'pending'
  },
  verificationStatus: {
    type: String,
    enum: VERIFICATION_STATUSES,
    default: 'pending'
  },
  drivingLicenseImage: { type: String, default: '', trim: true },
  insuranceImage: { type: String, default: '', trim: true },
  vehicleModel: { type: String, default: '', trim: true },
  vehiclePlate: { type: String, default: '', trim: true },
  serviceAreas: [{ type: String, trim: true }],
  serviceTypes: [{ type: String, trim: true }],
  paymentMethod: { type: String, default: '', trim: true },
  paymentAccount: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: false },
  /** 是否可接单（与 User.driverProfile.status 同步） */
  available: { type: Boolean, default: false },
  serviceStatus: {
    type: String,
    enum: ['idle', 'busy', 'offline'],
    default: 'offline'
  },
  adminNotes: { type: String, default: '', trim: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

DriverSchema.pre('save', function syncLegacyStatus(next) {
  if (this.verificationStatus === 'approved') this.status = 'approved'
  else if (this.verificationStatus === 'rejected') this.status = 'rejected'
  else if (this.verificationStatus === 'suspended') this.status = 'banned'
  else this.status = 'pending'
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('Driver', DriverSchema)
module.exports.VERIFICATION_STATUSES = VERIFICATION_STATUSES
