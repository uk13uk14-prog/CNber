const mongoose = require('mongoose')

const CODE_RE = /^[a-z][a-z0-9_]{0,31}$/

const VehicleClassConfigSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: CODE_RE
    },
    label: { type: String, required: true, trim: true },
    seats: { type: Number, default: null, min: 1, max: 99 },
    enabled: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 100 },
    remark: { type: String, default: '', trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
)

VehicleClassConfigSchema.index({ enabled: 1, sortOrder: 1 })

const VehicleClassConfig = mongoose.model('VehicleClassConfig', VehicleClassConfigSchema)

module.exports = VehicleClassConfig
module.exports.CODE_RE = CODE_RE
