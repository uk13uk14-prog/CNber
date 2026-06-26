const mongoose = require('mongoose')

const JOB_STATUSES = ['pending', 'running', 'success', 'failed']

const JOB_TYPES = [
  'dispatch_notify',
  'payment_reminder',
  'daily_report',
  'cleanup_logs'
]

const JobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: JOB_TYPES,
      index: true,
      trim: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: 'pending',
      index: true
    },
    priority: {
      type: Number,
      default: 0,
      index: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    lockedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    error: { type: String, default: '', trim: true },
    /** Worker 标识，用于 claim 时写入 */
    workerId: { type: String, default: '', trim: true }
  },
  { timestamps: true }
)

JobSchema.index({ status: 1, priority: -1, createdAt: 1 })
JobSchema.index({ status: 1, lockedAt: 1 })

const Job = mongoose.model('Job', JobSchema)

module.exports = Job
module.exports.JOB_STATUSES = JOB_STATUSES
module.exports.JOB_TYPES = JOB_TYPES
