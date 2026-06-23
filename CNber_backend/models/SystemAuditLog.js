const mongoose = require('mongoose')

const SystemAuditLogSchema = new mongoose.Schema(
  {
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    operatorPhone: { type: String, default: '', trim: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    module: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, default: '', trim: true, index: true },
    entityType: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

SystemAuditLogSchema.index({ createdAt: -1 })
SystemAuditLogSchema.index({ module: 1, createdAt: -1 })

module.exports = mongoose.model('SystemAuditLog', SystemAuditLogSchema)
