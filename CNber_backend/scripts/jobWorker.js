/**
 * CNber 后台任务 Worker（M1 单进程、低并发）
 *
 * 运行：pm2 start scripts/jobWorker.js --name cnber-job-worker
 * 环境：JOB_WORKER_CONCURRENCY=1（M1 固定为 1，勿自动扩容）
 */
require('dotenv').config()

if (!process.env.JWT_SECRET) {
  console.warn('[jobWorker] JWT_SECRET 未设置（Worker 不校验 JWT，仅连接 MongoDB）')
}

const mongoose = require('mongoose')
const {
  claimNextJob,
  markSuccess,
  markFailed
} = require('../services/jobQueueService')
const { getHandler } = require('../jobs/handlers')
const logger = require('../utils/logger')

const mongoUrl =
  process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/cnber'

/** M1 资源保护：并发上限硬编码为 1 */
const RAW_CONCURRENCY = Number(process.env.JOB_WORKER_CONCURRENCY || 1)
const CONCURRENCY = Math.min(Math.max(RAW_CONCURRENCY, 1), 1)

const POLL_INTERVAL_MS = Number(process.env.JOB_WORKER_POLL_MS || 3000)
const WORKER_ID = process.env.JOB_WORKER_ID || `worker-${process.pid}`

let running = 0
let shuttingDown = false

async function processOneJob() {
  if (running >= CONCURRENCY) return

  const job = await claimNextJob(WORKER_ID)
  if (!job) return

  running += 1
  try {
    const handler = getHandler(job.type)
    if (!handler) {
      throw new Error(`未知任务类型: ${job.type}`)
    }
    await handler(job.payload || {})
    await markSuccess(job._id)
    logger.info('[jobWorker] success', { jobId: job._id, type: job.type })
  } catch (err) {
    const message = err?.message || String(err)
    await markFailed(job._id, message)
    logger.warn('[jobWorker] failed', { jobId: job._id, type: job.type, error: message })
  } finally {
    running -= 1
  }
}

async function tick() {
  if (shuttingDown) return
  try {
    while (running < CONCURRENCY && !shuttingDown) {
      const before = running
      await processOneJob()
      if (running === before) break
    }
  } catch (err) {
    logger.error('[jobWorker] tick error', { message: err.message })
  }
}

function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info('[jobWorker] shutting down', { signal })
  setTimeout(() => {
    mongoose.connection.close(false).finally(() => process.exit(0))
  }, 5000)
}

async function main() {
  if (RAW_CONCURRENCY > 1) {
    console.warn(
      `[jobWorker] JOB_WORKER_CONCURRENCY=${RAW_CONCURRENCY} 已忽略，M1 固定为 1`
    )
  }

  await mongoose.connect(mongoUrl)
  logger.info('[jobWorker] started', {
    workerId: WORKER_ID,
    concurrency: CONCURRENCY,
    pollMs: POLL_INTERVAL_MS
  })

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  setInterval(tick, POLL_INTERVAL_MS)
  await tick()
}

main().catch((err) => {
  console.error('[jobWorker] fatal', err)
  process.exit(1)
})
