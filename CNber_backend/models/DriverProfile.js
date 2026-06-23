const mongoose = require('mongoose')

const PreferredRouteSchema = new mongoose.Schema(
  {
    from: { type: String, default: '', trim: true },
    to: { type: String, default: '', trim: true },
    count: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null }
  },
  { _id: false }
)

const DriverProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
      index: true
    },
    phone: { type: String, default: '', trim: true, index: true },
    name: { type: String, default: '', trim: true },
    vehicleClass: { type: String, default: '', trim: true, index: true },
    carPlate: { type: String, default: '', trim: true, index: true },
    carModel: { type: String, default: '', trim: true },
    serviceArea: [{ type: String, trim: true }],
    preferredRoutes: { type: [PreferredRouteSchema], default: [] },
    totalAssignedOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    onTimeRate: { type: Number, default: null },
    customerRatingAvg: { type: Number, default: null },
    ratingCount: { type: Number, default: 0 },
    positiveTags: [{ type: String, trim: true }],
    negativeTags: [{ type: String, trim: true }],
    driverSettlementTotalGbp: { type: Number, default: 0 },
    driverSettlementTotalCny: { type: Number, default: 0 },
    tags: [{ type: String, trim: true }],
    availabilityNotes: { type: String, default: '', trim: true },
    riskFlags: [{ type: String, trim: true }],
    notes: { type: String, default: '', trim: true },
    aiProfileSummary: { type: String, default: '', trim: true },
    aiLastAnalyzedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

DriverProfileSchema.index({ tags: 1 })
DriverProfileSchema.index({ serviceArea: 1 })

module.exports = mongoose.model('DriverProfile', DriverProfileSchema)
