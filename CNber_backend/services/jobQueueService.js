const Job = require('../models/Job')

/** 锁超时：running 超过此时间未 finish 可被重新 claim（秒） */
const LOCK_STALE_MS = Number(process.env.JOB_LOCK_STALE_MS || 10 * 60 * 1000)

/**
 * 入队任务（不阻塞业务请求）
 * @param {string} type
 * @param {object} payload
 * @param {{ priority?: number, maxAttempts?: number }} [options]
 */
async function enqueueJob(type, payload = {}, options = {}) {
  const job = await Job.create({
    type,
    payload,
    status: 'pending',
    priority: Number(options.priority) || 0,
    maxAttempts: Number(options.maxAttempts) || 3
  })
  return job
}

/**
 * 原子 claim 下一条 pending 任务
 * @param {string} workerType Worker 标识（写入 workerId）
 */
async function claimNextJob(workerType = 'default') {
  const now = new Date()
  const staleBefore = new Date(now.getTime() - LOCK_STALE_MS)

  // 回收过期 running 锁，避免 Worker 崩溃后任务永久卡住
  await Job.updateMany(
    {
      status: 'running',
      lockedAt: { $lt: staleBefore }
    },
    {
      $set: { status: 'pending', lockedAt: null }
    }
  )

  const job = await Job.findOneAndUpdate(
    {
      status: 'pending',
      $expr: { $lt: ['$attempts', '$maxAttempts'] }
    },
    {
      $set: {
        status: 'running',
        lockedAt: now,
        startedAt: now,
        workerId: String(workerType || 'default'),
        finishedAt: null,
        error: ''
      },
      $inc: { attempts: 1 }
    },
    {
      sort: { priority: -1, createdAt: 1 },
      new: true
    }
  )

  return job
}

async function markSuccess(jobId) {
  const now = new Date()
  return Job.findByIdAndUpdate(
    jobId,
    {
      $set: {
        status: 'success',
        finishedAt: now,
        lockedAt: null,
        error: ''
      }
    },
    { new: true }
  )
}

async function markFailed(jobId, errorMessage = '') {
  const job = await Job.findById(jobId)
  if (!job) return null

  const msg = String(errorMessage || 'unknown error').slice(0, 2000)
  const exhausted = job.attempts >= job.maxAttempts
  const now = new Date()

  return Job.findByIdAndUpdate(
    jobId,
    {
      $set: {
        status: exhausted ? 'failed' : 'pending',
        finishedAt: exhausted ? now : null,
        lockedAt: null,
        error: msg
      }
    },
    { new: true }
  )
}

async function getQueueStats() {
  const statuses = ['pending', 'running', 'success', 'failed']
  const counts = Object.fromEntries(statuses.map((s) => [s, 0]))

  const rows = await Job.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ])
  for (const row of rows) {
    if (row._id && counts[row._id] !== undefined) {
      counts[row._id] = row.count
    }
  }

  return {
    pending: counts.pending,
    running: counts.running,
    success: counts.success,
    failed: counts.failed,
    total: counts.pending + counts.running + counts.success + counts.failed
  }
}

async function listRecentJobs({ status, limit = 20 } = {}) {
  const query = {}
  if (status) query.status = status
  return Job.find(query)
    .sort({ updatedAt: -1 })
    .limit(Math.min(Number(limit) || 20, 100))
    .lean()
}

module.exports = {
  LOCK_STALE_MS,
  enqueueJob,
  claimNextJob,
  markSuccess,
  markFailed,
  getQueueStats,
  listRecentJobs
}
