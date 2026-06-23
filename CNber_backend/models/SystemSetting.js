const mongoose = require('mongoose')

const SystemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
)

const SystemSetting = mongoose.model('SystemSetting', SystemSettingSchema)

module.exports = SystemSetting
