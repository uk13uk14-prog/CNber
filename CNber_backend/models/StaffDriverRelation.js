const mongoose = require('mongoose')

/**
 * 客服/调度与司机的分层关系（同一 staff + driver 唯一）
 * layer: team 自己团队 | familiar 熟悉 | external 不熟/外部
 */
const StaffDriverRelationSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  layer: {
    type: String,
    enum: ['team', 'familiar', 'external'],
    required: true
  },
  relationScore: { type: Number, default: 0 },
  note: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
})

StaffDriverRelationSchema.index(
  { staffId: 1, driverUserId: 1 },
  { unique: true }
)

module.exports = mongoose.model('StaffDriverRelation', StaffDriverRelationSchema)
