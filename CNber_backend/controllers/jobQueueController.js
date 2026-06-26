const {
  getQueueStats,
  listRecentJobs,
  enqueueJob
} = require('../services/jobQueueService')
const { listJobTypes } = require('../jobs/handlers')
const Job = require('../models/Job')

/** GET /api/admin/jobs/stats */
exports.getJobQueueStats = async (req, res) => {
  const stats = await getQueueStats()
  res.json({
    code: 0,
    message: 'success',
    data: {
      ...stats,
      workerConcurrencyLimit: 1,
      jobTypes: listJobTypes()
    }
  })
}

/** GET /api/admin/jobs/recent */
exports.getRecentJobs = async (req, res) => {
  const status = req.query.status
  const limit = req.query.limit
  const allowed = ['pending', 'running', 'success', 'failed']
  if (status && !allowed.includes(status)) {
    const e = new Error('无效 status')
    e.code = 400
    throw e
  }

  const jobs = await listRecentJobs({ status, limit })
  res.json({
    code: 0,
    message: 'success',
    data: { jobs }
  })
}

/** GET /api/admin/jobs */
exports.listJobs = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20))
  const status = req.query.status
  const type = req.query.type

  const query = {}
  if (status) query.status = status
  if (type) query.type = type

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Job.countDocuments(query)
  ])

  res.json({
    code: 0,
    message: 'success',
    data: { jobs, total, page, pageSize }
  })
}

/** POST /api/admin/jobs/enqueue — 仅 admin 手动入队（调试/运维） */
exports.enqueueJobAdmin = async (req, res) => {
  const { type, payload, priority, maxAttempts } = req.body || {}
  if (!type) {
    const e = new Error('type 必填')
    e.code = 400
    throw e
  }

  const job = await enqueueJob(type, payload || {}, { priority, maxAttempts })
  res.status(201).json({
    code: 0,
    message: 'success',
    data: { job }
  })
}
